"""Bounded memoization of successful immutable-artifact integrity checks."""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
import json
from pathlib import Path
from threading import Lock
from typing import Callable


@dataclass(frozen=True)
class _ValidatedArtifact:
    paths: tuple[Path, ...]
    signature: tuple


class ArtifactValidationCache:
    """Skip repeated hashing only while every validated file is unchanged.

    This is an optimization for locally published immutable artifacts, not an
    authenticity check against an adversary controlling filesystem metadata.
    A restart discards the memo and performs full validation again.
    """

    def __init__(self, *, max_entries: int = 32, max_paths: int = 65536) -> None:
        self._max_entries = max_entries
        self._max_paths = max_paths
        self._entries: OrderedDict[tuple[Path, str], _ValidatedArtifact] = OrderedDict()
        self._path_count = 0
        self._lock = Lock()

    def validate(
        self,
        *,
        artifact_root: Path,
        artifact_id: str,
        validator: Callable[..., None],
    ) -> None:
        if len(artifact_id) != 32 or any(
            _character not in "0123456789abcdef" for _character in artifact_id
        ):
            validator(artifact_root=artifact_root, artifact_id=artifact_id)
            return
        _root = Path(artifact_root).resolve()
        _key = (_root, artifact_id)
        with self._lock:
            _entry = self._entries.get(_key)
            if _entry is not None:
                if _signature(_entry.paths) == _entry.signature:
                    self._entries.move_to_end(_key)
                    return
                self._path_count -= len(self._entries.pop(_key).paths)

        # Read the manifest only on a miss. The validator remains authoritative
        # for malformed/missing manifests and performs its normal quarantine.
        _paths = _artifact_paths(_root / artifact_id, self._max_paths)
        _before = _signature(_paths) if _paths else None
        validator(artifact_root=artifact_root, artifact_id=artifact_id)
        if _before is None or _signature(_paths) != _before:
            return

        with self._lock:
            _old = self._entries.pop(_key, None)
            if _old is not None:
                self._path_count -= len(_old.paths)
            self._entries[_key] = _ValidatedArtifact(_paths, _before)
            self._path_count += len(_paths)
            while (
                len(self._entries) > self._max_entries
                or self._path_count > self._max_paths
            ):
                _, _evicted = self._entries.popitem(last=False)
                self._path_count -= len(_evicted.paths)


def _artifact_paths(_path: Path, _maximum: int) -> tuple[Path, ...]:
    try:
        _manifest = json.loads((_path / "artifact.json").read_text(encoding="utf-8"))
        _files = _manifest["files"]
        if not isinstance(_files, list) or len(_files) * 2 + 6 > _maximum:
            return ()
        _paths = [_path, _path / "artifact.json", _path / "annotated.xml", _path / "index.sqlite"]
        for _file in _files:
            _source = _path / "sources" / _file["file_id"]
            _paths.extend((_source / "revision-0.txt", _source / "revision-1.txt"))
        # SQLite can expose changed pages through a sidecar without changing
        # index.sqlite. Track existence and metadata of both semantic sidecars.
        _paths.extend((_path / "index.sqlite-wal", _path / "index.sqlite-journal"))
        return tuple(_paths)
    except (OSError, ValueError, KeyError, TypeError):
        return ()


def _signature(_paths: tuple[Path, ...]) -> tuple | None:
    _result = []
    for _path in _paths:
        try:
            _stat = _path.stat()
        except FileNotFoundError:
            _result.append(None)
            continue
        except OSError:
            return None
        _result.append((
            _stat.st_dev, _stat.st_ino, _stat.st_mode, _stat.st_size,
            _stat.st_mtime_ns, _stat.st_ctime_ns,
        ))
    return tuple(_result)


artifact_validation_cache = ArtifactValidationCache()
