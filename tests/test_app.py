from __future__ import annotations

from pathlib import Path

from srcvisual.app import create_app


def test_root_serves_frontend_index_from_configured_dist(
    monkeypatch,
    tmp_path: Path,
) -> None:
    frontend_dist = tmp_path / "dist"
    frontend_dist.mkdir()
    (frontend_dist / "index.html").write_text("<html>frontend</html>", encoding="utf-8")

    monkeypatch.setenv("SRCVISUAL_FRONTEND_DIST", str(frontend_dist))

    client = create_app().test_client()
    response = client.get("/")

    assert response.status_code == 200
    assert response.get_data(as_text=True) == "<html>frontend</html>"


def test_static_asset_is_served_from_frontend_dist(
    monkeypatch,
    tmp_path: Path,
) -> None:
    frontend_dist = tmp_path / "dist"
    assets_dir = frontend_dist / "assets"
    assets_dir.mkdir(parents=True)
    (frontend_dist / "index.html").write_text("<html>frontend</html>", encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('ok');", encoding="utf-8")

    monkeypatch.setenv("SRCVISUAL_FRONTEND_DIST", str(frontend_dist))

    client = create_app().test_client()
    response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert response.get_data(as_text=True) == "console.log('ok');"


def test_client_side_route_falls_back_to_frontend_index(
    monkeypatch,
    tmp_path: Path,
) -> None:
    frontend_dist = tmp_path / "dist"
    frontend_dist.mkdir()
    (frontend_dist / "index.html").write_text("<html>frontend</html>", encoding="utf-8")

    monkeypatch.setenv("SRCVISUAL_FRONTEND_DIST", str(frontend_dist))

    client = create_app().test_client()
    response = client.get("/visualize/example")

    assert response.status_code == 200
    assert response.get_data(as_text=True) == "<html>frontend</html>"


def test_api_routes_still_take_precedence_over_frontend_fallback(
    monkeypatch,
    tmp_path: Path,
) -> None:
    frontend_dist = tmp_path / "dist"
    frontend_dist.mkdir()
    (frontend_dist / "index.html").write_text("<html>frontend</html>", encoding="utf-8")

    monkeypatch.setenv("SRCVISUAL_FRONTEND_DIST", str(frontend_dist))

    client = create_app().test_client()
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}
