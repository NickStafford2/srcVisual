from __future__ import annotations

from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
from uuid import uuid4

from srcvisual.runs.models import RunDiagnostic, RunEvent, RunRecord, RunStatus

RUN_STORE_SCHEMA_VERSION = 1
RUN_DATABASE_FILENAME = "runs.sqlite3"
TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})


class RunNotFoundError(LookupError):
    """The requested run does not exist."""


class InvalidRunTransitionError(RuntimeError):
    """The requested run transition violates the durable lifecycle."""


class RunStoreSchemaError(RuntimeError):
    """The run database has an unsupported schema."""


class RunStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as _database:
            _database.execute("PRAGMA journal_mode = WAL")
            _version = int(_database.execute("PRAGMA user_version").fetchone()[0])
            if _version not in {0, RUN_STORE_SCHEMA_VERSION}:
                raise RunStoreSchemaError(
                    "Unsupported run store schema: "
                    f"expected {RUN_STORE_SCHEMA_VERSION}, received {_version}."
                )
            _database.executescript(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    kind TEXT NOT NULL CHECK (kind = 'history-visualization'),
                    history_pair INTEGER NOT NULL CHECK (history_pair > 0),
                    status TEXT NOT NULL CHECK (
                        status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
                    ),
                    artifact_id TEXT,
                    cancellation_requested INTEGER NOT NULL DEFAULT 0 CHECK (
                        cancellation_requested IN (0, 1)
                    ),
                    diagnostic_code TEXT,
                    diagnostic_message TEXT,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT,
                    CHECK (
                        (diagnostic_code IS NULL AND diagnostic_message IS NULL)
                        OR
                        (diagnostic_code IS NOT NULL AND diagnostic_message IS NOT NULL)
                    ),
                    CHECK (
                        artifact_id IS NULL
                        OR (length(artifact_id) = 32 AND artifact_id NOT GLOB '*[^0-9a-f]*')
                    ),
                    CHECK (
                        (status = 'completed' AND artifact_id IS NOT NULL)
                        OR (status != 'completed' AND artifact_id IS NULL)
                    ),
                    CHECK (
                        (status = 'failed' AND diagnostic_code IS NOT NULL)
                        OR (status != 'failed' AND diagnostic_code IS NULL)
                    ),
                    CHECK (
                        (status IN ('completed', 'failed', 'cancelled') AND finished_at IS NOT NULL)
                        OR
                        (status NOT IN ('completed', 'failed', 'cancelled') AND finished_at IS NULL)
                    )
                );

                CREATE TABLE IF NOT EXISTS run_events (
                    run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
                    sequence INTEGER NOT NULL CHECK (sequence > 0),
                    type TEXT NOT NULL CHECK (
                        type IN ('status', 'progress', 'cancellation-requested')
                    ),
                    status TEXT NOT NULL CHECK (
                        status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
                    ),
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (run_id, sequence)
                );

                CREATE INDEX IF NOT EXISTS run_events_created_at
                    ON run_events(run_id, created_at);
                """
            )
            _database.execute(f"PRAGMA user_version = {RUN_STORE_SCHEMA_VERSION}")

    def create_history_run(self, history_pair: int) -> RunRecord:
        if (
            isinstance(history_pair, bool)
            or not isinstance(history_pair, int)
            or history_pair <= 0
        ):
            raise ValueError("History pair number must be a positive integer.")
        _run_id = uuid4().hex
        _created_at = _timestamp()
        with closing(self._connect()) as _database:
            _database.execute("BEGIN IMMEDIATE")
            try:
                _database.execute(
                    """
                    INSERT INTO runs (
                        run_id, kind, history_pair, status, created_at
                    ) VALUES (?, 'history-visualization', ?, 'queued', ?)
                    """,
                    (_run_id, history_pair, _created_at),
                )
                self._insert_event(
                    _database,
                    run_id=_run_id,
                    event_type="status",
                    status="queued",
                    message="History visualization queued.",
                    created_at=_created_at,
                )
                _database.commit()
            except Exception:
                _database.rollback()
                raise
        return self.read_run(_run_id)

    def mark_running(self, run_id: str) -> RunRecord:
        return self._transition(
            run_id,
            expected_statuses={"queued"},
            status="running",
            message="History visualization started.",
            set_started=True,
        )

    def append_progress(self, run_id: str, message: str) -> RunEvent:
        _message = _validated_message(message)
        with closing(self._connect()) as _database:
            _database.execute("BEGIN IMMEDIATE")
            try:
                _row = self._require_run(_database, run_id)
                if _row["status"] != "running":
                    raise InvalidRunTransitionError(
                        "Progress can only be appended to a running run."
                    )
                _event = self._insert_event(
                    _database,
                    run_id=run_id,
                    event_type="progress",
                    status="running",
                    message=_message,
                    created_at=_timestamp(),
                )
                _database.commit()
            except Exception:
                _database.rollback()
                raise
        return _event

    def request_cancellation(self, run_id: str) -> RunRecord:
        with closing(self._connect()) as _database:
            _database.execute("BEGIN IMMEDIATE")
            try:
                _row = self._require_run(_database, run_id)
                _status = str(_row["status"])
                if _status in TERMINAL_STATUSES:
                    raise InvalidRunTransitionError(
                        f"Cannot cancel a {_status} run."
                    )
                if not bool(_row["cancellation_requested"]):
                    _database.execute(
                        "UPDATE runs SET cancellation_requested = 1 WHERE run_id = ?",
                        (run_id,),
                    )
                    self._insert_event(
                        _database,
                        run_id=run_id,
                        event_type="cancellation-requested",
                        status=_status,  # type: ignore[arg-type]
                        message="Cancellation requested.",
                        created_at=_timestamp(),
                    )
                _database.commit()
            except Exception:
                _database.rollback()
                raise
        return self.read_run(run_id)

    def complete(self, run_id: str, artifact_id: str) -> RunRecord:
        _validate_artifact_id(artifact_id)
        return self._transition(
            run_id,
            expected_statuses={"running"},
            status="completed",
            message="Visualization artifact published.",
            artifact_id=artifact_id,
            set_finished=True,
            reject_cancellation=True,
        )

    def fail(self, run_id: str, *, code: str, message: str) -> RunRecord:
        _code = _validated_diagnostic_code(code)
        _message = _validated_message(message)
        return self._transition(
            run_id,
            expected_statuses={"queued", "running"},
            status="failed",
            message=_message,
            diagnostic=RunDiagnostic(code=_code, message=_message),
            set_finished=True,
        )

    def cancel(self, run_id: str) -> RunRecord:
        return self._transition(
            run_id,
            expected_statuses={"queued", "running"},
            status="cancelled",
            message="History visualization cancelled.",
            set_finished=True,
        )

    def read_run(self, run_id: str) -> RunRecord:
        _validate_run_id(run_id)
        with closing(self._connect()) as _database:
            _row = _database.execute(
                """
                SELECT runs.*, COALESCE(MAX(run_events.sequence), 0) AS latest_sequence
                FROM runs
                LEFT JOIN run_events USING (run_id)
                WHERE runs.run_id = ?
                GROUP BY runs.run_id
                """,
                (run_id,),
            ).fetchone()
        if _row is None:
            raise RunNotFoundError(f"Run not found: {run_id}")
        return _run_from_row(_row)

    def read_events(
        self,
        run_id: str,
        *,
        after: int = 0,
        limit: int = 100,
    ) -> tuple[RunEvent, ...]:
        _validate_run_id(run_id)
        if isinstance(after, bool) or not isinstance(after, int) or after < 0:
            raise ValueError("Run event cursor must be a nonnegative integer.")
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 500:
            raise ValueError("Run event limit must be between 1 and 500.")
        with closing(self._connect()) as _database:
            self._require_run(_database, run_id)
            _rows = _database.execute(
                """
                SELECT run_id, sequence, type, status, message, created_at
                FROM run_events
                WHERE run_id = ? AND sequence > ?
                ORDER BY sequence
                LIMIT ?
                """,
                (run_id, after, limit),
            ).fetchall()
        return tuple(_event_from_row(_row) for _row in _rows)

    def _transition(
        self,
        run_id: str,
        *,
        expected_statuses: set[str],
        status: RunStatus,
        message: str,
        artifact_id: str | None = None,
        diagnostic: RunDiagnostic | None = None,
        set_started: bool = False,
        set_finished: bool = False,
        reject_cancellation: bool = False,
    ) -> RunRecord:
        _validate_run_id(run_id)
        _now = _timestamp()
        with closing(self._connect()) as _database:
            _database.execute("BEGIN IMMEDIATE")
            try:
                _row = self._require_run(_database, run_id)
                _current_status = str(_row["status"])
                if _current_status not in expected_statuses:
                    raise InvalidRunTransitionError(
                        f"Cannot transition run from {_current_status} to {status}."
                    )
                if reject_cancellation and bool(_row["cancellation_requested"]):
                    raise InvalidRunTransitionError(
                        "Cannot complete a run after cancellation was requested."
                    )
                _database.execute(
                    """
                    UPDATE runs
                    SET status = ?, artifact_id = ?,
                        diagnostic_code = ?, diagnostic_message = ?,
                        started_at = CASE WHEN ? THEN ? ELSE started_at END,
                        finished_at = CASE WHEN ? THEN ? ELSE finished_at END
                    WHERE run_id = ?
                    """,
                    (
                        status,
                        artifact_id,
                        None if diagnostic is None else diagnostic.code,
                        None if diagnostic is None else diagnostic.message,
                        set_started,
                        _now,
                        set_finished,
                        _now,
                        run_id,
                    ),
                )
                self._insert_event(
                    _database,
                    run_id=run_id,
                    event_type="status",
                    status=status,
                    message=message,
                    created_at=_now,
                )
                _database.commit()
            except Exception:
                _database.rollback()
                raise
        return self.read_run(run_id)

    def _connect(self) -> sqlite3.Connection:
        _database = sqlite3.connect(self.database_path, timeout=30)
        _database.row_factory = sqlite3.Row
        _database.execute("PRAGMA foreign_keys = ON")
        _database.execute("PRAGMA busy_timeout = 30000")
        return _database

    @staticmethod
    def _require_run(database: sqlite3.Connection, run_id: str) -> sqlite3.Row:
        _validate_run_id(run_id)
        _row = database.execute(
            "SELECT * FROM runs WHERE run_id = ?",
            (run_id,),
        ).fetchone()
        if _row is None:
            raise RunNotFoundError(f"Run not found: {run_id}")
        return _row

    @staticmethod
    def _insert_event(
        database: sqlite3.Connection,
        *,
        run_id: str,
        event_type: str,
        status: RunStatus,
        message: str,
        created_at: str,
    ) -> RunEvent:
        _sequence = int(
            database.execute(
                """
                SELECT COALESCE(MAX(sequence), 0) + 1
                FROM run_events
                WHERE run_id = ?
                """,
                (run_id,),
            ).fetchone()[0]
        )
        database.execute(
            """
            INSERT INTO run_events (
                run_id, sequence, type, status, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (run_id, _sequence, event_type, status, message, created_at),
        )
        return RunEvent(
            run_id=run_id,
            sequence=_sequence,
            type=event_type,  # type: ignore[arg-type]
            status=status,
            message=message,
            created_at=created_at,
        )


def get_run_database_path(artifact_root: Path) -> Path:
    return artifact_root / RUN_DATABASE_FILENAME


def _run_from_row(row: sqlite3.Row) -> RunRecord:
    _diagnostic = None
    if row["diagnostic_code"] is not None:
        _diagnostic = RunDiagnostic(
            code=str(row["diagnostic_code"]),
            message=str(row["diagnostic_message"]),
        )
    return RunRecord(
        run_id=str(row["run_id"]),
        kind=str(row["kind"]),  # type: ignore[arg-type]
        history_pair=int(row["history_pair"]),
        status=str(row["status"]),  # type: ignore[arg-type]
        artifact_id=(None if row["artifact_id"] is None else str(row["artifact_id"])),
        cancellation_requested=bool(row["cancellation_requested"]),
        diagnostic=_diagnostic,
        created_at=str(row["created_at"]),
        started_at=(None if row["started_at"] is None else str(row["started_at"])),
        finished_at=(
            None if row["finished_at"] is None else str(row["finished_at"])
        ),
        latest_event_sequence=int(row["latest_sequence"]),
    )


def _event_from_row(row: sqlite3.Row) -> RunEvent:
    return RunEvent(
        run_id=str(row["run_id"]),
        sequence=int(row["sequence"]),
        type=str(row["type"]),  # type: ignore[arg-type]
        status=str(row["status"]),  # type: ignore[arg-type]
        message=str(row["message"]),
        created_at=str(row["created_at"]),
    )


def _validate_run_id(run_id: str) -> None:
    if len(run_id) != 32 or any(_character not in "0123456789abcdef" for _character in run_id):
        raise RunNotFoundError(f"Run not found: {run_id}")


def _validate_artifact_id(artifact_id: str) -> None:
    if len(artifact_id) != 32 or any(
        _character not in "0123456789abcdef" for _character in artifact_id
    ):
        raise ValueError("Artifact ID must be a 32-character lowercase hex string.")


def _validated_message(message: str) -> str:
    _message = message.strip()
    if not _message:
        raise ValueError("Run event message must not be empty.")
    return _message


def _validated_diagnostic_code(code: str) -> str:
    _code = code.strip()
    if not _code or any(
        not (_character.islower() or _character.isdigit() or _character == "-")
        for _character in _code
    ):
        raise ValueError(
            "Run diagnostic code must contain lowercase letters, digits, or hyphens."
        )
    return _code


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )
