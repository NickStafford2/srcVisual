from pathlib import Path

from srcvisual.artifacts.models import PublishedArtifact
from srcvisual.core.commands import BackendCommandError
from srcvisual.runs.store import RunStore
import srcvisual.runs.worker as worker_module
from srcvisual.runs.worker import HistoryRunWorker


def _worker(tmp_path: Path) -> tuple[RunStore, HistoryRunWorker]:
    _store = RunStore(tmp_path / "runs.sqlite3")
    _store.initialize()
    return _store, HistoryRunWorker(
        store=_store,
        history_repository=tmp_path / "repository",
        artifact_root=tmp_path / "artifacts",
    )


def test_worker_materializes_history_and_completes_with_published_artifact(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _store, _worker_instance = _worker(tmp_path)
    _run = _store.create_history_run(13)
    _materialized = tmp_path / "srcmove.xml"
    _materialized.write_text("<unit />", encoding="utf-8")
    _captured: dict[str, object] = {}

    monkeypatch.setattr(
        worker_module,
        "materialize_history_pair",
        lambda repository, pair_number: _materialized,
    )
    monkeypatch.setattr(
        worker_module,
        "read_materialized_move_results",
        lambda path: {"move_count": 0, "moves": []},
    )

    def _build_artifact(**kwargs) -> PublishedArtifact:
        _captured.update(kwargs)
        kwargs["progress"]("Using temp directory: /secret/scratch")
        kwargs["progress"]("Indexing canonical nodes.")
        return PublishedArtifact(
            artifact_id="a" * 32,
            path=tmp_path / ("a" * 32),
            manifest={},
        )

    monkeypatch.setattr(worker_module, "build_visualization_artifact", _build_artifact)

    assert _worker_instance.process_next() is True

    _completed = _store.read_run(_run.run_id)
    assert _completed.status == "completed"
    assert _completed.artifact_id == "a" * 32
    assert _captured["payload"] == b"<unit />"
    assert _captured["filename"] == "history-pair-13.srcmove.xml"
    assert [event.message for event in _store.read_events(_run.run_id)][-3:] == [
        "Building the immutable visualization artifact.",
        "Indexing canonical nodes.",
        "Visualization artifact published.",
    ]
    assert "/secret" not in " ".join(
        event.message for event in _store.read_events(_run.run_id)
    )


def test_worker_records_safe_failure_without_command_details(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _store, _worker_instance = _worker(tmp_path)
    _run = _store.create_history_run(4)

    def _fail(repository: Path, pair_number: int) -> Path:
        raise BackendCommandError(
            argv=("srcmove-history", "-C", "/secret/repository"),
            returncode=1,
            stdout="",
            stderr="failure in /secret/repository",
        )

    monkeypatch.setattr(worker_module, "materialize_history_pair", _fail)

    assert _worker_instance.process_next() is True

    _failed = _store.read_run(_run.run_id)
    assert _failed.status == "failed"
    assert _failed.diagnostic is not None
    assert _failed.diagnostic.code == "command-failed"
    assert _failed.diagnostic.message == "A visualization command failed."
    assert "/secret" not in _failed.diagnostic.message


def test_worker_reports_no_work_for_empty_queue(tmp_path: Path) -> None:
    _, _worker_instance = _worker(tmp_path)

    assert _worker_instance.process_next() is False
