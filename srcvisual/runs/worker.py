from __future__ import annotations

from contextlib import contextmanager
import fcntl
import logging
import os
from pathlib import Path
import signal
from threading import Event
from typing import Iterator

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
_LOGGER = logging.getLogger(__name__)


class HistoryRunWorker:
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

    def process_next(self) -> bool:
        _run = self.store.claim_next()
        if _run is None:
            return False
        try:
            self._execute(_run)
        except Exception as _error:
            _LOGGER.exception("History visualization run %s failed", _run.run_id)
            _current = self.store.read_run(_run.run_id)
            if _current.cancellation_requested:
                self.store.cancel(_run.run_id)
            else:
                _code, _message = _safe_failure(_error)
                self.store.fail(_run.run_id, code=_code, message=_message)
        return True

    def run(self, stop_event: Event, *, poll_seconds: float) -> None:
        while not stop_event.is_set():
            if not self.process_next():
                stop_event.wait(poll_seconds)

    def _execute(self, run: RunRecord) -> None:
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
            progress=lambda _message: self._record_progress(run.run_id, _message),
        )
        _current = self.store.read_run(run.run_id)
        if _current.cancellation_requested:
            self.store.cancel(run.run_id)
            return
        self.store.complete(run.run_id, _published.artifact_id)

    def _record_progress(self, run_id: str, message: str) -> None:
        if message.startswith(("Using temp directory:", "Keeping temp directory:")):
            return
        self.store.append_progress(run_id, message)


def main() -> None:
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
    _worker = HistoryRunWorker(
        store=_store,
        history_repository=_repository,
        artifact_root=_artifact_root,
    )
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
