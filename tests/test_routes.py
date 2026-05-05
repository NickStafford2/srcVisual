from __future__ import annotations

from srcvisual.app import create_app


def test_visualize_events_requires_token() -> None:
    client = create_app().test_client()

    response = client.get("/api/visualize/events")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Expected progress stream token in 'token' query parameter."
    }
