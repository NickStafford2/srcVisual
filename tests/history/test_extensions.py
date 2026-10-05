from pathlib import Path
from threading import Event

import pytest

from srcdiffvisual.history import extensions
from srcdiffvisual.history.repositories import HistoryRepository, HistoryRepositoryRegistry


def test_extension_deduplicates_active_requests_and_binds_absolute_target(monkeypatch, tmp_path: Path):
    registry = HistoryRepositoryRegistry({"fixture": HistoryRepository("fixture", "Fixture", tmp_path)}, "fixture")
    monkeypatch.setattr(extensions, "read_history_status", lambda repository: {"coverage": {"committed_commit_pairs": 10}, "history": {"exhausted": False}})
    monkeypatch.setattr(extensions, "read_history_definition", lambda repository: {"identity": "original"})
    database = tmp_path / "runs.sqlite3"
    first = extensions.queue_extension(database, registry, "fixture", 100)
    assert first["target"] == 110
    assert extensions.queue_extension(database, registry, "fixture", 100)["id"] == first["id"]
    monkeypatch.setattr(extensions, "read_history_definition", lambda repository: {"identity": "replacement"})
    assert extensions.process_extension(database, registry, Event())
    failed = extensions.read_extension(database, "fixture")
    assert failed["state"] == "failed"
    assert "analysis changed" in failed["message"]


@pytest.mark.parametrize("count", [0, -1, True, 1001, "100"])
def test_extension_rejects_invalid_increments(tmp_path: Path, count):
    registry = HistoryRepositoryRegistry({}, "fixture")
    with pytest.raises(ValueError, match="between"):
        extensions.queue_extension(tmp_path / "runs.sqlite3", registry, "fixture", count)


def test_thesis_snapshot_publishes_identical_bytes_and_preserves_existing(monkeypatch, tmp_path: Path):
    from srcdiffvisual.history.snapshots import publish_thesis_snapshot

    source = tmp_path / "snapshot.zip"
    source.write_bytes(b"original evidence")
    export_root = tmp_path / "thesis"
    monkeypatch.setenv("SRCDIFFVISUAL_HISTORY_EXPORT_ROOT", str(export_root))
    publish_thesis_snapshot(source, "fixture")
    publish_thesis_snapshot(source, "fixture")
    destination = export_root / "fixture" / source.name
    assert destination.read_bytes() == source.read_bytes()
    source.write_bytes(b"different evidence")
    with pytest.raises(ValueError, match="refusing to overwrite"):
        publish_thesis_snapshot(source, "fixture")
    assert destination.read_bytes() == b"original evidence"
