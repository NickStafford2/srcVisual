from pathlib import Path
import os
import subprocess
import sys

from srcvisual.artifacts.models import PublishedArtifact
from srcvisual.core.commands import BackendCommandError
from srcvisual.runs.store import RunStore
import srcvisual.runs.worker as worker_module
from srcvisual.runs.worker import HistoryRunExecutor, HistoryRunWorker


def _components(tmp_path: Path) -> tuple[RunStore, HistoryRunExecutor]:
    _store = RunStore(tmp_path / "runs.sqlite3")
    _store.initialize()
    return _store, HistoryRunExecutor(
        store=_store,
        history_repository=tmp_path / "repository",
        artifact_root=tmp_path / "artifacts",
    )


def test_executor_materializes_history_and_completes_with_published_artifact(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _store, _executor = _components(tmp_path)
    _run = _store.create_history_run(13)
    _store.claim_next()
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

    _executor.execute(_run.run_id, "a" * 32)

    _completed = _store.read_run(_run.run_id)
    assert _completed.status == "completed"
    assert _completed.artifact_id == "a" * 32
    assert _captured["payload"] == b"<unit />"
    assert _captured["filename"] == "history-pair-13.srcmove.xml"
    assert _captured["artifact_id"] == "a" * 32
    assert [event.message for event in _store.read_events(_run.run_id)][-3:] == [
        "Building the immutable visualization artifact.",
        "Indexing canonical nodes.",
        "Visualization artifact published.",
    ]
    assert "/secret" not in " ".join(
        event.message for event in _store.read_events(_run.run_id)
    )


def test_executor_records_safe_failure_without_command_details(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _store, _executor = _components(tmp_path)
    _run = _store.create_history_run(4)
    _store.claim_next()

    def _fail(repository: Path, pair_number: int) -> Path:
        raise BackendCommandError(
            argv=("srcmove-history", "-C", "/secret/repository"),
            returncode=1,
            stdout="",
            stderr="failure in /secret/repository",
        )

    monkeypatch.setattr(worker_module, "materialize_history_pair", _fail)

    _executor.execute(_run.run_id, "b" * 32)

    _failed = _store.read_run(_run.run_id)
    assert _failed.status == "failed"
    assert _failed.diagnostic is not None
    assert _failed.diagnostic.code == "command-failed"
    assert _failed.diagnostic.message == "A visualization command failed."
    assert "/secret" not in _failed.diagnostic.message


def test_worker_reports_no_work_for_empty_queue(tmp_path: Path) -> None:
    _store, _ = _components(tmp_path)

    assert HistoryRunWorker(store=_store, artifact_root=tmp_path).process_next() is False


def test_worker_terminates_process_group_before_marking_run_cancelled(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("SRCVISUAL_TMP_ROOT", str(tmp_path / "scratch"))
    _store, _ = _components(tmp_path)
    _run = _store.create_history_run(9)
    _terminated: list[object] = []
    _artifact_ids: list[str] = []

    class _Process:
        def poll(self):
            return None

    def _start(run_id: str, artifact_id: str):
        _artifact_ids.append(artifact_id)
        _staging = tmp_path / ".staging" / artifact_id
        _staging.mkdir(parents=True)
        (_staging / "partial").touch()
        _scratch = worker_module._run_tmp_root(run_id)
        _scratch.mkdir(parents=True)
        (_scratch / "partial").touch()
        _store.request_cancellation(run_id)
        return _Process()

    monkeypatch.setattr(worker_module, "_start_run_process", _start)
    monkeypatch.setattr(
        worker_module,
        "_terminate_process_group",
        lambda process: _terminated.append(process),
    )
    _cancel = _store.cancel

    def _cancel_after_termination(run_id: str):
        assert _terminated
        return _cancel(run_id)

    monkeypatch.setattr(_store, "cancel", _cancel_after_termination)

    assert HistoryRunWorker(store=_store, artifact_root=tmp_path).process_next() is True

    assert len(_terminated) == 1
    assert _store.read_run(_run.run_id).status == "cancelled"
    assert not (tmp_path / ".staging" / _artifact_ids[0]).exists()
    assert not worker_module._run_tmp_root(_run.run_id).exists()


def test_process_group_termination_reaps_the_execution_process() -> None:
    _process = subprocess.Popen(
        [sys.executable, "-c", "import time; time.sleep(60)"],
        start_new_session=True,
    )

    worker_module._terminate_process_group(_process)

    assert _process.returncode is not None


def test_execute_run_child_mode_observes_preexisting_cancellation(
    tmp_path: Path,
) -> None:
    _artifact_root = tmp_path / "artifacts"
    _store = RunStore(_artifact_root / "runs.sqlite3")
    _store.initialize()
    _run = _store.create_history_run(10)
    _store.claim_next()
    _store.request_cancellation(_run.run_id)
    _environment = os.environ.copy()
    _environment["SRCVISUAL_ARTIFACT_ROOT"] = str(_artifact_root)
    _environment["SRCVISUAL_HISTORY_REPOSITORY"] = str(tmp_path / "repository")

    subprocess.run(
        [
            sys.executable,
            "-m",
            "srcvisual.runs.worker",
            "--execute-run",
            _run.run_id,
            "--artifact-id",
            "d" * 32,
        ],
        check=True,
        env=_environment,
    )

    assert _store.read_run(_run.run_id).status == "running"
