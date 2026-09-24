from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import sqlite3

import pytest

from srcvisual.runs.store import InvalidRunTransitionError, RunStore


def _store(tmp_path: Path) -> RunStore:
    _store = RunStore(tmp_path / "runs.sqlite3")
    _store.initialize()
    return _store


def test_history_run_and_ordered_events_survive_new_store_instance(
    tmp_path: Path,
) -> None:
    _store_instance = _store(tmp_path)
    _queued = _store_instance.create_history_run(13)
    _running = _store_instance.mark_running(_queued.run_id)
    _progress = _store_instance.append_progress(
        _queued.run_id,
        "Regenerating the pair with frozen tools.",
    )
    _completed = _store_instance.complete(_queued.run_id, "a" * 32)

    _reopened = RunStore(tmp_path / "runs.sqlite3")
    _reopened.initialize()
    _stored = _reopened.read_run(_queued.run_id)
    _events = _reopened.read_events(_queued.run_id)

    assert _queued.status == "queued"
    assert _running.status == "running"
    assert _progress.sequence == 3
    assert _completed.status == "completed"
    assert _stored.artifact_id == "a" * 32
    assert _stored.latest_event_sequence == 4
    assert [event.sequence for event in _events] == [1, 2, 3, 4]
    assert [event.type for event in _events] == [
        "status",
        "status",
        "progress",
        "status",
    ]
    assert _events[-1].status == "completed"


def test_failed_run_has_safe_diagnostic_and_cannot_complete(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _run = _store_instance.create_history_run(7)
    _failed = _store_instance.fail(
        _run.run_id,
        code="history-command-failed",
        message="The frozen history comparison failed.",
    )

    assert _failed.status == "failed"
    assert _failed.artifact_id is None
    assert _failed.diagnostic is not None
    assert _failed.diagnostic.to_dict() == {
        "code": "history-command-failed",
        "message": "The frozen history comparison failed.",
    }
    with pytest.raises(InvalidRunTransitionError, match="failed to completed"):
        _store_instance.complete(_run.run_id, "b" * 32)


def test_cancellation_request_is_durable_and_idempotent(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _run = _store_instance.create_history_run(21)
    _store_instance.mark_running(_run.run_id)

    _requested = _store_instance.request_cancellation(_run.run_id)
    _requested_again = _store_instance.request_cancellation(_run.run_id)

    assert _requested.cancellation_requested is True
    assert _requested.status == "running"
    assert _requested_again.latest_event_sequence == _requested.latest_event_sequence
    assert [event.type for event in _store_instance.read_events(_run.run_id)] == [
        "status",
        "status",
        "cancellation-requested",
    ]
    with pytest.raises(InvalidRunTransitionError, match="after cancellation"):
        _store_instance.complete(_run.run_id, "c" * 32)


def test_event_cursor_returns_only_later_events(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _run = _store_instance.create_history_run(2)
    _store_instance.mark_running(_run.run_id)
    _store_instance.append_progress(_run.run_id, "Working.")

    _events = _store_instance.read_events(_run.run_id, after=1, limit=1)

    assert len(_events) == 1
    assert _events[0].sequence == 2


def test_only_one_store_can_atomically_claim_a_queued_run(tmp_path: Path) -> None:
    _first = _store(tmp_path)
    _second = RunStore(tmp_path / "runs.sqlite3")
    _second.initialize()
    _queued = _first.create_history_run(8)

    _claimed = _first.claim_next()

    assert _claimed is not None
    assert _claimed.run_id == _queued.run_id
    assert _claimed.status == "running"
    assert _second.claim_next() is None


def test_concurrent_matching_requests_share_one_active_run(tmp_path: Path) -> None:
    _first = _store(tmp_path)
    _second = RunStore(tmp_path / "runs.sqlite3")
    _second.initialize()
    _fingerprint = "d" * 64

    with ThreadPoolExecutor(max_workers=2) as _executor:
        _results = list(
            _executor.map(
                lambda store: store.acquire_history_run(8, _fingerprint),
                (_first, _second),
            )
        )

    assert len({_run.run_id for _run, _reuse in _results}) == 1
    assert {_reuse for _run, _reuse in _results} == {"new", "active-run"}


def test_completed_matching_run_is_offered_for_validation(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _fingerprint = "e" * 64
    _run, _reuse = _store_instance.acquire_history_run(4, _fingerprint)
    assert _reuse == "new"
    _store_instance.mark_running(_run.run_id)
    _store_instance.complete(_run.run_id, "a" * 32)

    _reused, _reuse = _store_instance.acquire_history_run(4, _fingerprint)
    _fresh, _fresh_reuse = _store_instance.acquire_history_run(
        4,
        _fingerprint,
        excluded_completed_run_ids=frozenset({_run.run_id}),
    )

    assert _reused.run_id == _run.run_id
    assert _reuse == "artifact"
    assert _fresh.run_id != _run.run_id
    assert _fresh_reuse == "new"


def test_version_one_store_migrates_without_losing_runs(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _existing = _store_instance.create_history_run(2)
    with sqlite3.connect(tmp_path / "runs.sqlite3") as _database:
        _database.execute("DROP INDEX active_run_fingerprint")
        _database.execute("ALTER TABLE runs DROP COLUMN fingerprint")
        _database.execute("PRAGMA user_version = 1")

    _reopened = RunStore(tmp_path / "runs.sqlite3")
    _reopened.initialize()
    _new, _reuse = _reopened.acquire_history_run(3, "f" * 64)

    assert _reopened.read_run(_existing.run_id).history_pair == 2
    assert _new.history_pair == 3
    assert _reuse == "new"
    with sqlite3.connect(tmp_path / "runs.sqlite3") as _database:
        assert _database.execute("PRAGMA user_version").fetchone() == (2,)


def test_abandoned_running_runs_fail_while_queued_runs_remain(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _running = _store_instance.create_history_run(1)
    _queued = _store_instance.create_history_run(2)
    _store_instance.mark_running(_running.run_id)

    assert _store_instance.fail_abandoned_runs() == 1

    _failed = _store_instance.read_run(_running.run_id)
    assert _failed.status == "failed"
    assert _failed.diagnostic is not None
    assert _failed.diagnostic.code == "worker-restarted"
    assert _store_instance.read_run(_queued.run_id).status == "queued"


def test_claim_cancels_queued_request_before_starting_next_run(tmp_path: Path) -> None:
    _store_instance = _store(tmp_path)
    _cancelled = _store_instance.create_history_run(1)
    _next = _store_instance.create_history_run(2)
    _store_instance.request_cancellation(_cancelled.run_id)

    _claimed = _store_instance.claim_next()

    assert _claimed is not None
    assert _claimed.run_id == _next.run_id
    assert _store_instance.read_run(_cancelled.run_id).status == "cancelled"
    assert (
        _store_instance.request_cancellation(_cancelled.run_id).status == "cancelled"
    )
