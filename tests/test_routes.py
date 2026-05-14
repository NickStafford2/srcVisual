from __future__ import annotations

from pathlib import Path

import srcvisual.web._routes as routes_module
from srcvisual.web.app import create_app
from srcvisual.workflow.models import RevisionFile, VisualizationPayload, VisualizedFile


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


def test_visualize_returns_move_results(monkeypatch) -> None:
    def fake_build_visualization_payload(**kwargs) -> VisualizationPayload:
        del kwargs
        return VisualizationPayload(
            source_filename="example.xml",
            moved_srcdiff_xml="<unit />",
            move_results={
                "move_count": 1,
                "moves": [
                    {
                        "move_id": "move-1",
                        "from_xpaths": ["/src:unit[1]/diff:delete[1]"],
                        "from_node_ids": ["/src:unit[1]/diff:delete[1]"],
                        "to_xpaths": ["/src:unit[1]/diff:insert[1]"],
                        "to_node_ids": ["/src:unit[1]/diff:insert[1]"],
                        "from_raw_texts": ["int a;"],
                        "to_raw_texts": ["int a;"],
                    }
                ],
                "annotated_regions": 2,
                "regions_total": 2,
                "candidates_total": 2,
                "groups_total": 1,
            },
            has_position_data=True,
            files=(
                VisualizedFile(
                    revision_file=RevisionFile(
                        unit_id=1,
                        filename="a.cpp",
                        language="C++",
                        revision_0_source_code="int a;\n",
                        revision_1_source_code="int a;\n",
                    ),
                    tree=None,
                ),
            ),
        )

    monkeypatch.setattr(
        routes_module,
        "build_visualization_payload",
        fake_build_visualization_payload,
    )

    client = create_app().test_client()
    response = client.post(
        "/api/visualize",
        data={"srcdiff_xml": "<unit />"},
    )

    assert response.status_code == 200
    assert response.get_json()["move_results"] == {
        "move_count": 1,
        "moves": [
            {
                "move_id": "move-1",
                "from_xpaths": ["/src:unit[1]/diff:delete[1]"],
                "from_node_ids": ["/src:unit[1]/diff:delete[1]"],
                "to_xpaths": ["/src:unit[1]/diff:insert[1]"],
                "to_node_ids": ["/src:unit[1]/diff:insert[1]"],
                "from_raw_texts": ["int a;"],
                "to_raw_texts": ["int a;"],
            }
        ],
        "annotated_regions": 2,
        "regions_total": 2,
        "candidates_total": 2,
        "groups_total": 1,
    }
