import json
from pathlib import Path

import srcvisual.runs.events as events_module
from srcvisual.runs.events import stream_run_events
from srcvisual.runs.store import RunStore


def _store(tmp_path: Path) -> RunStore:
    _store = RunStore(tmp_path / "runs.sqlite3")
    _store.initialize()
    return _store


def test_event_stream_replays_after_cursor_in_sequence_and_closes_at_terminal(
    tmp_path: Path,
) -> None:
    _store_instance = _store(tmp_path)
    _run = _store_instance.create_history_run(3)
    _store_instance.mark_running(_run.run_id)
    _store_instance.append_progress(_run.run_id, "Working.")
    _store_instance.fail(
        _run.run_id,
        code="test-failure",
        message="The test run failed.",
    )

    _messages = list(
        stream_run_events(
            _store_instance,
            _run.run_id,
            after=1,
            poll_seconds=0,
        )
    )

    assert [message.splitlines()[0] for message in _messages] == [
        "id: 2",
        "id: 3",
        "id: 4",
    ]
    _payload = json.loads(_messages[-1].split("data: ", 1)[1])
    assert _payload["schema_version"] == 1
    assert _payload["event"]["status"] == "failed"


def test_active_event_stream_sends_heartbeat_when_idle(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _store_instance = _store(tmp_path)
    _run = _store_instance.create_history_run(3)
    _running = _store_instance.mark_running(_run.run_id)
    _times = iter((0.0, 16.0))
    monkeypatch.setattr(events_module.time, "monotonic", lambda: next(_times))
    _stream = stream_run_events(
        _store_instance,
        _run.run_id,
        after=_running.latest_event_sequence,
        poll_seconds=0,
        heartbeat_seconds=15,
    )

    assert next(_stream) == ": keep-alive\n\n"
    _stream.close()
