from __future__ import annotations

import argparse
from contextlib import contextmanager
import fcntl
import logging
import os
from pathlib import Path
import signal
import shutil
import subprocess
import sys
from threading import Event
import time
from typing import Iterator
from uuid import uuid4

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.artifacts.store import get_artifact_root
from srcvisual.core.commands import BackendCommandError
from srcvisual.history.client import (
    HistoryConfigurationError,
    HistoryResponseError,
    get_history_repository,
    materialize_history_pair,
    read_materialized_move_results,
)
from srcvisual.runs.models import RunRecord
from srcvisual.runs.store import RunStore, get_run_database_path
from srcvisual.workflow.payload import build_visualization_artifact

_DEFAULT_POLL_SECONDS = 1.0
_PROCESS_POLL_SECONDS = 0.1
_TERMINATION_TIMEOUT_SECONDS = 5.0
_TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})
_LOGGER = logging.getLogger(__name__)


class _ExecutionTerminated(Exception):
    """The queue worker terminated this run's process group."""


class HistoryRunWorker:
    def __init__(self, *, store: RunStore, artifact_root: Path) -> None:
        self.store = store
        self.artifact_root = artifact_root

    def process_next(self, stop_event: Event | None = None) -> bool:
        _run = self.store.claim_next()
        if _run is None:
            return False
        _artifact_id = uuid4().hex
        _process = _start_run_process(_run.run_id, _artifact_id)
        self._monitor(_run, _artifact_id, _process, stop_event or Event())
        return True

    def run(self, stop_event: Event, *, poll_seconds: float) -> None:
        while not stop_event.is_set():
            if not self.process_next(stop_event):
                stop_event.wait(poll_seconds)

    def _monitor(
        self,
        run: RunRecord,
        artifact_id: str,
        process: subprocess.Popen[bytes],
        stop_event: Event,
    ) -> None:
        while process.poll() is None:
            _current = self.store.read_run(run.run_id)
            if _current.cancellation_requested:
                _terminate_process_group(process)
                _remove_unpublished_run_data(
                    self.artifact_root,
                    artifact_id,
                    run.run_id,
                )
                _after_termination = self.store.read_run(run.run_id)
                if _after_termination.status not in _TERMINAL_STATUSES:
                    self.store.cancel(run.run_id)
                return
            if stop_event.is_set():
                _terminate_process_group(process)
                _remove_unpublished_run_data(
                    self.artifact_root,
                    artifact_id,
                    run.run_id,
                )
                _after_termination = self.store.read_run(run.run_id)
                if _after_termination.status not in _TERMINAL_STATUSES:
                    self.store.fail(
                        run.run_id,
                        code="worker-stopped",
                        message="The history worker stopped before this run completed.",
                    )
                return
            time.sleep(_PROCESS_POLL_SECONDS)

        _completed = self.store.read_run(run.run_id)
        if (
            _completed.cancellation_requested
            and _completed.status not in _TERMINAL_STATUSES
        ):
            _remove_unpublished_run_data(
                self.artifact_root,
                artifact_id,
                run.run_id,
            )
            self.store.cancel(run.run_id)
            return
        if _completed.status not in _TERMINAL_STATUSES:
            _remove_unpublished_run_data(
                self.artifact_root,
                artifact_id,
                run.run_id,
            )
            self.store.fail(
                run.run_id,
                code="worker-process-failed",
                message="The history execution process stopped unexpectedly.",
            )
            return
        if not _keep_tmp_files():
            shutil.rmtree(_run_tmp_root(run.run_id), ignore_errors=True)


class HistoryRunExecutor:
    def __init__(
        self,
        *,
        store: RunStore,
        history_repository: Path,
        artifact_root: Path,
    ) -> None:
        self.store = store
        self.history_repository = history_repository
        self.artifact_root = artifact_root

    def execute(self, run_id: str, artifact_id: str) -> None:
        _run = self.store.read_run(run_id)
        if _run.status != "running":
            raise RuntimeError("Only a claimed running run can be executed.")
        if _run.cancellation_requested:
            return
        try:
            self._build(_run, artifact_id)
        except _ExecutionTerminated:
            raise
        except Exception as _error:
            _LOGGER.exception("History visualization run %s failed", run_id)
            _current = self.store.read_run(run_id)
            if _current.cancellation_requested:
                return
            else:
                _code, _message = _safe_failure(_error)
                self.store.fail(run_id, code=_code, message=_message)

    def _build(self, run: RunRecord, artifact_id: str) -> None:
        self.store.append_progress(
            run.run_id,
            f"Regenerating history pair {run.history_pair} with its frozen tools.",
        )
        _materialized = materialize_history_pair(
            self.history_repository,
            run.history_pair,
        )
        _producer_results = read_materialized_move_results(_materialized)
        self.store.append_progress(
            run.run_id,
            "Building the immutable visualization artifact.",
        )
        _published = build_visualization_artifact(
            filename=f"history-pair-{run.history_pair}.srcmove.xml",
            payload=_materialized.read_bytes(),
            artifact_root=self.artifact_root,
            provenance=ArtifactProvenance(
                origin="history",
                history_pair=run.history_pair,
                move_results_source=(
                    "provided" if _producer_results is not None else "reconstructed"
                ),
            ),
            producer_move_results=_producer_results,
            artifact_id=artifact_id,
            progress=lambda _message: self._record_progress(run.run_id, _message),
        )
        _current = self.store.read_run(run.run_id)
        if _current.cancellation_requested:
            return
        self.store.complete(run.run_id, _published.artifact_id)

    def _record_progress(self, run_id: str, message: str) -> None:
        if message.startswith(("Using temp directory:", "Keeping temp directory:")):
            return
        self.store.append_progress(run_id, message)


def main() -> None:
    _arguments = _parse_arguments()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    _artifact_root = get_artifact_root()
    _store = RunStore(get_run_database_path(_artifact_root))
    _store.initialize()
    _repository = get_history_repository()
    if _repository is None:
        raise HistoryConfigurationError(
            "SRCVISUAL_HISTORY_REPOSITORY is required by the history worker."
        )
    if _arguments.execute_run is not None:
        def _terminate_execution(signum: int, frame: object) -> None:
            del signum, frame
            raise _ExecutionTerminated()

        signal.signal(signal.SIGTERM, _terminate_execution)
        try:
            HistoryRunExecutor(
                store=_store,
                history_repository=_repository,
                artifact_root=_artifact_root,
            ).execute(_arguments.execute_run, _arguments.artifact_id)
        except _ExecutionTerminated:
            pass
        return

    _worker = HistoryRunWorker(store=_store, artifact_root=_artifact_root)
    _stop_event = Event()

    def _stop(signum: int, frame: object) -> None:
        del signum, frame
        _stop_event.set()

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    _poll_seconds = _get_poll_seconds()
    with _exclusive_worker_lock(_artifact_root / "runs.worker.lock"):
        _recovered = _store.fail_abandoned_runs()
        if _recovered:
            _LOGGER.warning("Marked %d abandoned run(s) as failed", _recovered)
        _LOGGER.info("History worker started")
        _worker.run(_stop_event, poll_seconds=_poll_seconds)
        _LOGGER.info("History worker stopped")


def _parse_arguments() -> argparse.Namespace:
    _parser = argparse.ArgumentParser(description="Process queued history runs.")
    _parser.add_argument("--execute-run")
    _parser.add_argument("--artifact-id")
    _arguments = _parser.parse_args()
    if (_arguments.execute_run is None) != (_arguments.artifact_id is None):
        _parser.error("--execute-run and --artifact-id must be provided together")
    return _arguments


def _start_run_process(run_id: str, artifact_id: str) -> subprocess.Popen[bytes]:
    _environment = os.environ.copy()
    _environment["SRCVISUAL_TMP_ROOT"] = str(_run_tmp_root(run_id))
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "srcvisual.runs.worker",
            "--execute-run",
            run_id,
            "--artifact-id",
            artifact_id,
        ],
        env=_environment,
        start_new_session=True,
    )


def _terminate_process_group(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        process.wait()
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        process.wait()
        return
    try:
        process.wait(timeout=_TERMINATION_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()


def _remove_unpublished_run_data(
    artifact_root: Path,
    artifact_id: str,
    run_id: str,
) -> None:
    shutil.rmtree(artifact_root / ".staging" / artifact_id, ignore_errors=True)
    shutil.rmtree(_run_tmp_root(run_id), ignore_errors=True)


def _run_tmp_root(run_id: str) -> Path:
    _base = Path(os.environ.get("SRCVISUAL_TMP_ROOT", "/tmp/srcvisual"))
    return _base / f"run-{run_id}"


def _keep_tmp_files() -> bool:
    return os.environ.get("SRCVISUAL_KEEP_TMP", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _safe_failure(error: Exception) -> tuple[str, str]:
    if isinstance(error, HistoryConfigurationError):
        return (
            "history-configuration-error",
            "History visualization is not configured correctly.",
        )
    if isinstance(error, HistoryResponseError):
        return (
            "history-response-error",
            "srcMove returned an invalid history comparison response.",
        )
    if isinstance(error, BackendCommandError):
        if error.missing_command is not None:
            return "command-unavailable", "A required visualization tool is unavailable."
        if error.timed_out:
            return "command-timeout", "A visualization command timed out."
        return "command-failed", "A visualization command failed."
    return "artifact-build-failed", "The visualization artifact could not be built."


def _get_poll_seconds() -> float:
    _raw_value = os.environ.get(
        "SRCVISUAL_HISTORY_WORKER_POLL_SECONDS",
        str(_DEFAULT_POLL_SECONDS),
    )
    try:
        _value = float(_raw_value)
    except ValueError as _error:
        raise ValueError(
            "SRCVISUAL_HISTORY_WORKER_POLL_SECONDS must be a positive number."
        ) from _error
    if _value <= 0:
        raise ValueError(
            "SRCVISUAL_HISTORY_WORKER_POLL_SECONDS must be greater than zero."
        )
    return _value


@contextmanager
def _exclusive_worker_lock(path: Path) -> Iterator[None]:
    _descriptor = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(_descriptor, "w", encoding="utf-8") as _lock_file:
        try:
            fcntl.flock(_lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as _error:
            raise RuntimeError("Another history worker already owns this run queue.") from _error
        try:
            yield
        finally:
            fcntl.flock(_lock_file, fcntl.LOCK_UN)


if __name__ == "__main__":
    main()
