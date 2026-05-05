from __future__ import annotations

from pathlib import Path

from srcvisual.app import create_app


def test_visualize_events_requires_token() -> None:
    client = create_app().test_client()

    response = client.get("/api/visualize/events")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Expected progress stream token in 'token' query parameter."
    }


def test_list_examples_returns_filenames(
    monkeypatch,
    tmp_path: Path,
) -> None:
    examples_dir = tmp_path / "examples"
    examples_dir.mkdir()
    (examples_dir / "alpha.xml").write_text("<unit />", encoding="utf-8")
    (examples_dir / "beta.srcdiff").write_text("<unit />", encoding="utf-8")
    (examples_dir / "ignore.txt").write_text("nope", encoding="utf-8")

    monkeypatch.setenv("SRCVISUAL_EXAMPLES_DIR", str(examples_dir))

    client = create_app().test_client()
    response = client.get("/api/examples")

    assert response.status_code == 200
    assert response.get_json() == {"examples": ["alpha.xml", "beta.srcdiff"]}


def test_get_example_returns_file_content(
    monkeypatch,
    tmp_path: Path,
) -> None:
    examples_dir = tmp_path / "examples"
    examples_dir.mkdir()
    (examples_dir / "alpha.xml").write_text("<unit />", encoding="utf-8")

    monkeypatch.setenv("SRCVISUAL_EXAMPLES_DIR", str(examples_dir))

    client = create_app().test_client()
    response = client.get("/api/examples/alpha.xml")

    assert response.status_code == 200
    assert response.get_json() == {"filename": "alpha.xml", "content": "<unit />"}


def test_get_example_rejects_unknown_filename(
    monkeypatch,
    tmp_path: Path,
) -> None:
    examples_dir = tmp_path / "examples"
    examples_dir.mkdir()

    monkeypatch.setenv("SRCVISUAL_EXAMPLES_DIR", str(examples_dir))

    client = create_app().test_client()
    response = client.get("/api/examples/../secret.xml")

    assert response.status_code == 404
