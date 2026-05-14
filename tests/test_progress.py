from __future__ import annotations

from srcvisual.web._progress import ProgressBroker, ProgressEvent, format_sse_event


def test_format_sse_event_serializes_json_payload() -> None:
    payload = format_sse_event(ProgressEvent(type="progress", message="Running srcdiff"))

    assert payload == 'data: {"type":"progress","message":"Running srcdiff"}\n\n'


def test_progress_broker_stream_yields_connected_then_terminal_events() -> None:
    broker = ProgressBroker()
    token = "progress-token"

    stream = broker.stream(token)
    assert next(stream) == 'data: {"type":"connected","message":"Connected."}\n\n'

    broker.publish_progress(token, "Extracting revision sources from srcdiff.")
    broker.publish_complete(token, "Visualization complete.")

    assert next(stream) == (
        'data: {"type":"progress","message":"Extracting revision sources from srcdiff."}\n\n'
    )
    assert next(stream) == (
        'data: {"type":"complete","message":"Visualization complete."}\n\n'
    )
