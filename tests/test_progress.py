from __future__ import annotations

import json
import srcvisual.web._progress as progress_module
from srcvisual.web._progress import ProgressBroker, ProgressEvent, format_sse_event


def test_format_sse_event_serializes_json_payload() -> None:
    payload = format_sse_event(
        ProgressEvent(
            type="progress",
            message="Running srcdiff",
            elapsed_ms=120,
            delta_ms=45,
        )
    )

    assert payload == (
        'data: {"type":"progress","message":"Running srcdiff","elapsed_ms":120,"delta_ms":45}\n\n'
    )


def test_progress_broker_stream_yields_connected_then_terminal_events(monkeypatch) -> None:
    timeline = iter(
        [
            9.0,
            10.0,
            10.0,
            10.0,
            10.0,
            10.01,
            10.01,
            10.03,
            10.03,
            10.03,
            10.03,
            10.10,
            10.10,
            10.18,
            10.18,
            10.18,
            10.18,
        ]
    )
    monkeypatch.setattr(progress_module.time, "monotonic", lambda: next(timeline))

    broker = ProgressBroker()
    token = "progress-token"

    stream = broker.stream(token)
    connected = _parse_sse_event(next(stream))
    assert connected == {
        "type": "connected",
        "message": "Connected.",
        "elapsed_ms": 0,
        "delta_ms": 0,
    }

    broker.publish_progress(token, "Extracting revision sources from srcdiff.")
    broker.publish_complete(token, "Visualization complete.")

    progress = _parse_sse_event(next(stream))
    assert progress["type"] == "progress"
    assert progress["message"] == "Extracting revision sources from srcdiff."
    assert isinstance(progress["elapsed_ms"], int)
    assert isinstance(progress["delta_ms"], int)
    assert progress["elapsed_ms"] >= 0
    assert progress["delta_ms"] >= 0

    complete = _parse_sse_event(next(stream))
    assert complete["type"] == "complete"
    assert complete["message"] == "Visualization complete."
    assert isinstance(complete["elapsed_ms"], int)
    assert isinstance(complete["delta_ms"], int)
    assert complete["elapsed_ms"] >= progress["elapsed_ms"]
    assert complete["delta_ms"] >= 0


def _parse_sse_event(raw_event: str) -> dict[str, object]:
    prefix = "data: "
    assert raw_event.startswith(prefix)
    assert raw_event.endswith("\n\n")
    return json.loads(raw_event.removeprefix(prefix).strip())
