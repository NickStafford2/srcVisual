"""Disposable, size-bounded line alignment shared by web workers and restarts."""

from __future__ import annotations

from contextlib import closing
from difflib import SequenceMatcher
import hashlib
import json
import logging
from pathlib import Path
import sqlite3
import time
import zlib

MAX_CACHE_BYTES = 64 * 1024 * 1024
MAX_ENTRY_BYTES = 1024 * 1024
MAX_ENTRIES = 4096
_LOGGER = logging.getLogger(__name__)


def alignment_opcodes(
    _left: list[str], _right: list[str], *, artifact_root: Path | None = None
) -> list:
    # Hash the actual input, not a mutable repository label or commit-pair number.
    _identity = json.dumps(
        [1, _left, _right], ensure_ascii=True, separators=(",", ":")
    ).encode()
    _key = hashlib.sha256(_identity).hexdigest()
    _database_path = (
        artifact_root / ".projection-cache" / "alignment.sqlite3"
        if artifact_root
        else None
    )
    if _database_path is not None:
        try:
            with closing(_connect(_database_path)) as _database:
                _row = _database.execute(
                    "SELECT payload FROM alignments WHERE key = ?", (_key,)
                ).fetchone()
                if _row is not None:
                    _decoder = zlib.decompressobj()
                    _raw_cached = _decoder.decompress(_row[0], MAX_ENTRY_BYTES + 1)
                    _opcodes = (
                        json.loads(_raw_cached)
                        if _decoder.eof and len(_raw_cached) <= MAX_ENTRY_BYTES
                        else None
                    )
                    if _valid_opcodes(_opcodes, len(_left), len(_right)):
                        try:
                            with _database:
                                _database.execute(
                                    "UPDATE alignments SET used = ? WHERE key = ?",
                                    (time.time_ns(), _key),
                                )
                        except sqlite3.Error:
                            # A competing writer must not discard a valid hit.
                            pass
                        return _opcodes
        except (OSError, sqlite3.Error, ValueError, zlib.error, TypeError):
            _LOGGER.debug(
                "Alignment cache unavailable; computing from source.", exc_info=True
            )
    _opcodes = [
        list(_opcode)
        for _opcode in SequenceMatcher(None, _left, _right, autojunk=False).get_opcodes()
    ]
    _raw = json.dumps(_opcodes, separators=(",", ":")).encode()
    if _database_path is not None and len(_raw) <= MAX_ENTRY_BYTES:
        _payload = zlib.compress(_raw)
        try:
            with closing(_connect(_database_path, initialize=True)) as _database, _database:
                # Keep headroom for SQLite pages and indexes; max_page_count also
                # enforces a physical bound if entries have substantial overhead.
                _size, _count = _database.execute(
                    "SELECT coalesce(sum(length(payload)), 0), count(*) FROM alignments"
                ).fetchone()
                while _size + len(_payload) > MAX_CACHE_BYTES // 2 or _count >= MAX_ENTRIES:
                    _oldest = _database.execute(
                        "SELECT key, length(payload) FROM alignments ORDER BY used LIMIT 1"
                    ).fetchone()
                    if _oldest is None:
                        break
                    _database.execute(
                        "DELETE FROM alignments WHERE key = ?", (_oldest[0],)
                    )
                    _size -= _oldest[1]
                    _count -= 1
                _database.execute(
                    "INSERT OR REPLACE INTO alignments VALUES (?, ?, ?)",
                    (_key, _payload, time.time_ns()),
                )
        except (OSError, sqlite3.Error):
            _LOGGER.debug("Could not retain optional alignment cache.", exc_info=True)
    return _opcodes


def _connect(_path: Path, *, initialize: bool = False) -> sqlite3.Connection:
    if not initialize:
        # Cache hits need no schema/PRAGMA writes, even during another writer.
        return sqlite3.connect(f"{_path.resolve().as_uri()}?mode=rw", uri=True, timeout=0.2)
    _path.parent.mkdir(parents=True, exist_ok=True)
    _database = sqlite3.connect(_path, timeout=0.2)
    try:
        _database.execute("PRAGMA auto_vacuum = FULL")
        _page_size = _database.execute("PRAGMA page_size").fetchone()[0]
        _database.execute(f"PRAGMA max_page_count = {MAX_CACHE_BYTES // _page_size}")
        _database.execute(
            "CREATE TABLE IF NOT EXISTS alignments (key TEXT PRIMARY KEY, payload BLOB NOT NULL, used INTEGER NOT NULL)"
        )
        _database.execute(
            "CREATE INDEX IF NOT EXISTS alignment_recency ON alignments(used)"
        )
        _database.commit()
    except Exception:
        _database.close()
        raise
    return _database


def _valid_opcodes(_opcodes: object, _left_count: int, _right_count: int) -> bool:
    if not isinstance(_opcodes, list):
        return False
    _left = _right = 0
    for _item in _opcodes:
        if not isinstance(_item, list) or len(_item) != 5:
            return False
        _tag, _i, _j, _k, _l = _item
        if _tag not in ("equal", "replace", "insert", "delete") or not all(
            type(_n) is int for _n in (_i, _j, _k, _l)
        ):
            return False
        if (
            _i != _left
            or _k != _right
            or not _i <= _j <= _left_count
            or not _k <= _l <= _right_count
        ):
            return False
        if _tag == "equal" and _j - _i != _l - _k:
            return False
        _left, _right = _j, _l
    return _left == _left_count and _right == _right_count
