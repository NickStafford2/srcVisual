from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import stat
from typing import Literal

from srcvisual.artifacts.store import ArtifactIntegrityError, check_artifact_integrity

ArtifactIntegrityStatus = Literal["valid", "corrupt"]


@dataclass(frozen=True)
class ArtifactInventoryItem:
    artifact_id: str
    size_bytes: int
    created_at: datetime | None
    integrity: ArtifactIntegrityStatus
    diagnostic: str | None
    protected: bool

    def to_dict(self) -> dict[str, object]:
        return {
            "artifact_id": self.artifact_id,
            "size_bytes": self.size_bytes,
            "created_at": (
                None if self.created_at is None else self.created_at.isoformat()
            ),
            "integrity": self.integrity,
            "diagnostic": self.diagnostic,
            "protected": self.protected,
        }


@dataclass(frozen=True)
class ArtifactInventory:
    items: tuple[ArtifactInventoryItem, ...]

    @property
    def total_bytes(self) -> int:
        return sum(_item.size_bytes for _item in self.items)

    def to_dict(self) -> dict[str, object]:
        return {
            "artifact_count": len(self.items),
            "total_bytes": self.total_bytes,
            "valid_count": sum(_item.integrity == "valid" for _item in self.items),
            "corrupt_count": sum(
                _item.integrity == "corrupt" for _item in self.items
            ),
            "protected_count": sum(_item.protected for _item in self.items),
            "items": [_item.to_dict() for _item in self.items],
        }


@dataclass(frozen=True)
class ArtifactRetentionPolicy:
    max_artifacts: int | None = None
    max_bytes: int | None = None
    max_age_seconds: int | None = None

    def __post_init__(self) -> None:
        for _name, _value in (
            ("max_artifacts", self.max_artifacts),
            ("max_bytes", self.max_bytes),
            ("max_age_seconds", self.max_age_seconds),
        ):
            if _value is not None and _value < 0:
                raise ValueError(f"{_name} must be nonnegative.")

    def to_dict(self) -> dict[str, int | None]:
        return {
            "max_artifacts": self.max_artifacts,
            "max_bytes": self.max_bytes,
            "max_age_seconds": self.max_age_seconds,
        }


@dataclass(frozen=True)
class ArtifactCollectionCandidate:
    artifact_id: str
    size_bytes: int
    reasons: tuple[Literal["age", "count", "bytes"], ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "artifact_id": self.artifact_id,
            "size_bytes": self.size_bytes,
            "reasons": list(self.reasons),
        }


@dataclass(frozen=True)
class ArtifactCollectionPlan:
    policy: ArtifactRetentionPolicy
    candidates: tuple[ArtifactCollectionCandidate, ...]
    remaining_artifacts: int
    remaining_bytes: int
    satisfies_policy: bool

    @property
    def reclaimable_bytes(self) -> int:
        return sum(_candidate.size_bytes for _candidate in self.candidates)

    def to_dict(self) -> dict[str, object]:
        return {
            "dry_run": True,
            "policy": self.policy.to_dict(),
            "candidate_count": len(self.candidates),
            "reclaimable_bytes": self.reclaimable_bytes,
            "remaining_artifacts": self.remaining_artifacts,
            "remaining_bytes": self.remaining_bytes,
            "satisfies_policy": self.satisfies_policy,
            "candidates": [_candidate.to_dict() for _candidate in self.candidates],
        }


def inventory_artifacts(
    *,
    artifact_root: Path,
    protected_artifact_ids: frozenset[str] = frozenset(),
) -> ArtifactInventory:
    """Inspect published artifacts without moving or deleting store contents."""
    if not artifact_root.is_dir():
        return ArtifactInventory(items=())

    _items = [
        _inventory_item(
            artifact_root=artifact_root,
            artifact_path=_path,
            protected=_path.name in protected_artifact_ids,
        )
        for _path in artifact_root.iterdir()
        if _is_artifact_directory(_path)
    ]
    _items.sort(key=_inventory_sort_key)
    return ArtifactInventory(items=tuple(_items))


def plan_artifact_collection(
    inventory: ArtifactInventory,
    policy: ArtifactRetentionPolicy,
    *,
    now: datetime | None = None,
) -> ArtifactCollectionPlan:
    """Return deterministic deletion candidates without changing the store."""
    _now = now or datetime.now(timezone.utc)
    if _now.tzinfo is None:
        raise ValueError("now must be timezone-aware.")
    _now = _now.astimezone(timezone.utc)

    _selected_reasons: dict[str, list[Literal["age", "count", "bytes"]]] = {}
    _ordered_items = sorted(inventory.items, key=_inventory_sort_key)
    _eligible = [
        _item
        for _item in _ordered_items
        if _item.integrity == "valid" and not _item.protected
    ]

    if policy.max_age_seconds is not None:
        _cutoff = _now - timedelta(seconds=policy.max_age_seconds)
        for _item in _eligible:
            assert _item.created_at is not None
            if _item.created_at <= _cutoff:
                _selected_reasons[_item.artifact_id] = ["age"]

    _selected_ids = set(_selected_reasons)
    _remaining_count = len(inventory.items) - len(_selected_ids)
    _remaining_bytes = inventory.total_bytes - sum(
        _item.size_bytes for _item in _eligible if _item.artifact_id in _selected_ids
    )

    for _item in _eligible:
        if _item.artifact_id in _selected_ids:
            continue
        _reasons: list[Literal["age", "count", "bytes"]] = []
        if policy.max_artifacts is not None and _remaining_count > policy.max_artifacts:
            _reasons.append("count")
        if policy.max_bytes is not None and _remaining_bytes > policy.max_bytes:
            _reasons.append("bytes")
        if not _reasons:
            continue
        _selected_reasons[_item.artifact_id] = _reasons
        _selected_ids.add(_item.artifact_id)
        _remaining_count -= 1
        _remaining_bytes -= _item.size_bytes

    _candidates = tuple(
        ArtifactCollectionCandidate(
            artifact_id=_item.artifact_id,
            size_bytes=_item.size_bytes,
            reasons=tuple(_selected_reasons[_item.artifact_id]),
        )
        for _item in _ordered_items
        if _item.artifact_id in _selected_ids
    )
    _satisfies_policy = (
        (policy.max_artifacts is None or _remaining_count <= policy.max_artifacts)
        and (policy.max_bytes is None or _remaining_bytes <= policy.max_bytes)
        and all(
            _item.protected
            or _item.integrity == "corrupt"
            or policy.max_age_seconds is None
            or _item.created_at is None
            or _item.created_at > _now - timedelta(seconds=policy.max_age_seconds)
            or _item.artifact_id in _selected_ids
            for _item in _ordered_items
        )
    )
    return ArtifactCollectionPlan(
        policy=policy,
        candidates=_candidates,
        remaining_artifacts=_remaining_count,
        remaining_bytes=_remaining_bytes,
        satisfies_policy=_satisfies_policy,
    )


def _inventory_item(
    *,
    artifact_root: Path,
    artifact_path: Path,
    protected: bool,
) -> ArtifactInventoryItem:
    _size_bytes = _directory_size(artifact_path)
    try:
        check_artifact_integrity(
            artifact_root=artifact_root,
            artifact_id=artifact_path.name,
        )
        _created_at = _read_created_at(artifact_path)
    except (ArtifactIntegrityError, OSError, ValueError) as _error:
        return ArtifactInventoryItem(
            artifact_id=artifact_path.name,
            size_bytes=_size_bytes,
            created_at=None,
            integrity="corrupt",
            diagnostic=str(_error),
            protected=protected,
        )
    return ArtifactInventoryItem(
        artifact_id=artifact_path.name,
        size_bytes=_size_bytes,
        created_at=_created_at,
        integrity="valid",
        diagnostic=None,
        protected=protected,
    )


def _read_created_at(artifact_path: Path) -> datetime:
    _document = json.loads(
        (artifact_path / "artifact.json").read_text(encoding="utf-8")
    )
    _raw_created_at = _document.get("created_at")
    if not isinstance(_raw_created_at, str):
        raise ValueError("Artifact manifest has no creation timestamp.")
    try:
        _created_at = datetime.fromisoformat(_raw_created_at)
    except ValueError as _error:
        raise ValueError("Artifact manifest has an invalid creation timestamp.") from _error
    if _created_at.tzinfo is None:
        raise ValueError("Artifact creation timestamp must include a timezone.")
    return _created_at.astimezone(timezone.utc)


def _directory_size(path: Path) -> int:
    _total = 0
    for _root, _directories, _filenames in os.walk(path, followlinks=False):
        _directories.sort()
        for _filename in sorted(_filenames):
            try:
                _stat = (Path(_root) / _filename).lstat()
            except FileNotFoundError:
                continue
            if stat.S_ISREG(_stat.st_mode):
                _total += _stat.st_size
    return _total


def _is_artifact_directory(path: Path) -> bool:
    return (
        path.is_dir()
        and len(path.name) == 32
        and all(_character in "0123456789abcdef" for _character in path.name)
    )


def _inventory_sort_key(item: ArtifactInventoryItem) -> tuple[datetime, str]:
    return (
        item.created_at or datetime.max.replace(tzinfo=timezone.utc),
        item.artifact_id,
    )
