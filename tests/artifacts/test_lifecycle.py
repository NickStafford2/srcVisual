from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

import pytest

import srcvisual.artifacts.lifecycle as lifecycle_module
from srcvisual.artifacts.lifecycle import (
    ArtifactCollectionCandidate,
    ArtifactInventory,
    ArtifactInventoryItem,
    ArtifactRetentionPolicy,
    inventory_artifacts,
    plan_artifact_collection,
)
from srcvisual.artifacts.store import ArtifactIntegrityError


def test_inventory_is_read_only_and_ignores_nonartifact_storage(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _valid_id = "a" * 32
    _corrupt_id = "b" * 32
    _write_inventory_fixture(
        tmp_path / _valid_id,
        created_at="2026-01-01T00:00:00+00:00",
    )
    _write_inventory_fixture(
        tmp_path / _corrupt_id,
        created_at="2026-01-02T00:00:00+00:00",
    )
    (tmp_path / ".staging").mkdir()
    (tmp_path / "bigmovebench-reviews").mkdir()
    (tmp_path / "runs.sqlite3").touch()

    def _check_integrity(*, artifact_root: Path, artifact_id: str) -> None:
        assert artifact_root == tmp_path
        if artifact_id == _corrupt_id:
            raise ArtifactIntegrityError("Artifact checksum mismatch: annotated.xml.")

    monkeypatch.setattr(lifecycle_module, "check_artifact_integrity", _check_integrity)

    _inventory = inventory_artifacts(
        artifact_root=tmp_path,
        protected_artifact_ids=frozenset({_valid_id}),
    )

    assert [_item.artifact_id for _item in _inventory.items] == [
        _valid_id,
        _corrupt_id,
    ]
    assert _inventory.items[0].integrity == "valid"
    assert _inventory.items[0].protected is True
    assert _inventory.items[1].integrity == "corrupt"
    assert _inventory.items[1].diagnostic == (
        "Artifact checksum mismatch: annotated.xml."
    )
    assert _inventory.to_dict()["artifact_count"] == 2
    assert _inventory.to_dict()["protected_count"] == 1
    assert (tmp_path / _corrupt_id).is_dir()


def test_collection_plan_is_deterministic_and_protects_references() -> None:
    _now = datetime(2026, 9, 24, tzinfo=timezone.utc)
    _inventory = ArtifactInventory(
        items=(
            _item("c", "2026-09-20T00:00:00+00:00"),
            _item("d", None, integrity="corrupt"),
            _item("b", "2026-09-01T00:00:00+00:00", protected=True),
            _item("a", "2026-01-01T00:00:00+00:00"),
        )
    )

    _plan = plan_artifact_collection(
        _inventory,
        ArtifactRetentionPolicy(
            max_artifacts=2,
            max_bytes=100,
            max_age_seconds=30 * 24 * 60 * 60,
        ),
        now=_now,
    )

    assert _plan.candidates == (
        ArtifactCollectionCandidate(
            artifact_id="a" * 32,
            size_bytes=60,
            reasons=("age",),
        ),
        ArtifactCollectionCandidate(
            artifact_id="c" * 32,
            size_bytes=60,
            reasons=("count", "bytes"),
        ),
    )
    assert _plan.remaining_artifacts == 2
    assert _plan.remaining_bytes == 120
    assert _plan.reclaimable_bytes == 120
    assert _plan.satisfies_policy is False
    assert all(
        _candidate.artifact_id not in {"b" * 32, "d" * 32}
        for _candidate in _plan.candidates
    )


def test_retention_policy_rejects_negative_limits() -> None:
    with pytest.raises(ValueError, match="max_bytes must be nonnegative"):
        ArtifactRetentionPolicy(max_bytes=-1)


def _write_inventory_fixture(path: Path, *, created_at: str) -> None:
    path.mkdir()
    (path / "artifact.json").write_text(
        json.dumps({"created_at": created_at}),
        encoding="utf-8",
    )
    (path / "content.bin").write_bytes(b"artifact-content")


def _item(
    identifier: str,
    created_at: str | None,
    *,
    integrity: lifecycle_module.ArtifactIntegrityStatus = "valid",
    protected: bool = False,
) -> ArtifactInventoryItem:
    return ArtifactInventoryItem(
        artifact_id=identifier * 32,
        size_bytes=60,
        created_at=(
            None if created_at is None else datetime.fromisoformat(created_at)
        ),
        integrity=integrity,
        diagnostic=None if integrity == "valid" else "corrupt",
        protected=protected,
    )
