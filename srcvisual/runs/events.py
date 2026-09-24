from __future__ import annotations

import json
import time
from typing import Iterator

from srcvisual.runs.models import RUN_CONTRACT_SCHEMA_VERSION, RunEvent
from srcvisual.runs.store import RunStore

_DEFAULT_POLL_SECONDS = 0.5
_DEFAULT_HEARTBEAT_SECONDS = 15.0
_TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})


def stream_run_events(
    store: RunStore,
    run_id: str,
    *,
    after: int,
    poll_seconds: float = _DEFAULT_POLL_SECONDS,
    heartbeat_seconds: float = _DEFAULT_HEARTBEAT_SECONDS,
) -> Iterator[str]:
    _cursor = after
    _last_output = time.monotonic()
    while True:
        _events = store.read_events(run_id, after=_cursor)
        for _event in _events:
            _cursor = _event.sequence
            _last_output = time.monotonic()
            yield _format_run_event(_event)

        _run = store.read_run(run_id)
        if _run.status in _TERMINAL_STATUSES and _cursor >= _run.latest_event_sequence:
            return

        _now = time.monotonic()
        if _now - _last_output >= heartbeat_seconds:
            _last_output = _now
            yield ": keep-alive\n\n"
        time.sleep(poll_seconds)


def _format_run_event(event: RunEvent) -> str:
    _payload = json.dumps(
        {
            "schema_version": RUN_CONTRACT_SCHEMA_VERSION,
            "event": event.to_dict(),
        },
        separators=(",", ":"),
    )
    return f"id: {event.sequence}\nevent: run\ndata: {_payload}\n\n"
