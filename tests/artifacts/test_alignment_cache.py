from contextlib import closing
import sqlite3

from srcdiffvisual.artifacts import _alignment
from srcdiffvisual.artifacts.projections import _align_lines


def test_alignment_survives_reopening_and_preserves_projection(tmp_path, monkeypatch):
    _left = ["same", "old", "tail"]
    _right = ["same", "new", "added", "tail"]
    _expected = _align_lines(_left, _right)
    assert _align_lines(_left, _right, artifact_root=tmp_path) == _expected

    def _unexpected(*_args, **_kwargs):
        raise AssertionError("A retained alignment should avoid recomputation")

    monkeypatch.setattr(_alignment, "SequenceMatcher", _unexpected)
    assert _align_lines(_left, _right, artifact_root=tmp_path) == _expected


def test_alignment_cache_tracks_content_and_recovers_invalid_entry(tmp_path):
    _first = _alignment.alignment_opcodes(["a"], ["a"], artifact_root=tmp_path)
    _changed = _alignment.alignment_opcodes(["a"], ["b"], artifact_root=tmp_path)
    assert _first != _changed
    _path = tmp_path / ".projection-cache" / "alignment.sqlite3"
    with closing(sqlite3.connect(_path)) as _database, _database:
        _database.execute("UPDATE alignments SET payload = ?", (b"corrupt",))
    assert _alignment.alignment_opcodes(["a"], ["a"], artifact_root=tmp_path) == _first


def test_unwritable_cache_does_not_prevent_source_loading(tmp_path):
    (tmp_path / ".projection-cache").write_text("not a directory")
    assert _align_lines(["old"], ["new"], artifact_root=tmp_path) == _align_lines(
        ["old"], ["new"]
    )


def test_busy_recency_update_preserves_a_cache_hit(tmp_path, monkeypatch):
    _expected = _alignment.alignment_opcodes(["old"], ["new"], artifact_root=tmp_path)
    _path = tmp_path / ".projection-cache" / "alignment.sqlite3"

    def _unexpected(*_args, **_kwargs):
        raise AssertionError("A writer lock must not discard a valid cached alignment")

    monkeypatch.setattr(_alignment, "SequenceMatcher", _unexpected)
    with closing(sqlite3.connect(_path)) as _writer:
        _writer.execute("BEGIN IMMEDIATE")
        assert _alignment.alignment_opcodes(["old"], ["new"], artifact_root=tmp_path) == _expected


def test_alignment_cache_evicts_old_entries_and_bounds_disk(tmp_path, monkeypatch):
    monkeypatch.setattr(_alignment, "MAX_CACHE_BYTES", 32768)
    _large = [f"common {_n}" for _n in range(100)]
    for _index in range(100):
        _right = [
            _line if _n % 2 else f"changed {_index} {_n}"
            for _n, _line in enumerate(_large)
        ]
        _alignment.alignment_opcodes(_large, _right, artifact_root=tmp_path)
    _path = tmp_path / ".projection-cache" / "alignment.sqlite3"
    assert _path.stat().st_size <= 32768
    with closing(sqlite3.connect(_path)) as _database:
        assert (
            0 < _database.execute("SELECT count(*) FROM alignments").fetchone()[0] < 100
        )


def test_alignment_cache_caps_tiny_entries(tmp_path, monkeypatch):
    monkeypatch.setattr(_alignment, "MAX_ENTRIES", 3)
    for _n in range(5):
        _alignment.alignment_opcodes([str(_n)], ["new"], artifact_root=tmp_path)
    _path = tmp_path / ".projection-cache" / "alignment.sqlite3"
    with closing(sqlite3.connect(_path)) as _database:
        assert _database.execute("SELECT count(*) FROM alignments").fetchone()[0] == 3
