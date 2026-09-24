from __future__ import annotations

from pathlib import Path

import srcvisual.web._routes as routes_module
from srcvisual.artifacts.models import ArtifactProvenance, PublishedArtifact
from srcvisual.files.models import RevisionFile, VisualizedFile
from srcvisual.web.app import create_app
from srcvisual.workflow.models import VisualizationPayload


def test_visualize_events_requires_token() -> None:
    client = create_app().test_client()

    response = client.get("/api/visualize/events")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Expected progress stream token in 'token' query parameter."
    }


def test_artifact_source_endpoint_forwards_focus_and_expanded_ranges(
    monkeypatch, tmp_path: Path
) -> None:
    captured: dict[str, object] = {}
    monkeypatch.setenv("SRCVISUAL_ARTIFACT_ROOT", str(tmp_path))

    def fake_read_source_projection(**kwargs):
        captured.update(kwargs)
        return {"schema_version": 1, "blocks": []}

    monkeypatch.setattr(
        routes_module, "read_source_projection", fake_read_source_projection
    )
    client = create_app().test_client()

    response = client.get(
        "/api/artifacts/" + "a" * 32 + "/files/f-one/source"
        "?focus=moves&left_range=2:4&right_range=3:5"
    )

    assert response.status_code == 200
    assert captured["focus_profile"] == "moves"
    assert captured["expanded_ranges"] == (((2, 4), (3, 5)),)


def test_visualize_can_return_artifact_manifest(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("SRCVISUAL_ARTIFACT_ROOT", str(tmp_path))
    artifact_id = "a" * 32
    published = PublishedArtifact(
        artifact_id=artifact_id,
        path=tmp_path / artifact_id,
        manifest={"artifact_id": artifact_id},
    )
    monkeypatch.setattr(
        routes_module,
        "build_visualization_artifact",
        lambda **kwargs: published,
    )
    monkeypatch.setattr(
        routes_module,
        "read_artifact_manifest",
        lambda **kwargs: {
            "artifact_id": artifact_id,
            "projection_schema_version": 1,
        },
    )

    response = (
        create_app()
        .test_client()
        .post(
            "/api/visualize",
            data={"srcdiff_xml": "<unit />", "response_format": "artifact"},
        )
    )

    assert response.status_code == 200
    assert response.get_json()["artifact_id"] == artifact_id


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


def test_history_status_requires_configured_repository(monkeypatch) -> None:
    monkeypatch.delenv("SRCVISUAL_HISTORY_REPOSITORY", raising=False)

    client = create_app().test_client()
    response = client.get("/api/history/status")

    assert response.status_code == 503
    assert "not configured" in response.get_json()["error"]


def test_history_status_returns_cli_document(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("SRCVISUAL_HISTORY_REPOSITORY", str(tmp_path))
    monkeypatch.setattr(
        routes_module,
        "read_history_status",
        lambda repository: {
            "schema_version": 2,
            "analysis": {"name": "notepadpp"},
            "state": "target_reached",
        },
    )

    client = create_app().test_client()
    response = client.get("/api/history/status")

    assert response.status_code == 200
    assert response.get_json()["analysis"]["name"] == "notepadpp"


def test_history_pairs_validates_and_forwards_query(
    monkeypatch,
    tmp_path: Path,
) -> None:
    captured: dict[str, object] = {}
    monkeypatch.setenv("SRCVISUAL_HISTORY_REPOSITORY", str(tmp_path))

    def fake_read_history_pairs(repository, **kwargs):
        captured.update(kwargs)
        return {
            "schema_version": 1,
            "pairs": {"items": [], "next_after": None},
        }

    monkeypatch.setattr(
        routes_module,
        "read_history_pairs",
        fake_read_history_pairs,
    )

    client = create_app().test_client()
    response = client.get(
        "/api/history/pairs?selection=moves&limit=25&after=5&oldest_first=true"
    )

    assert response.status_code == 200
    assert captured == {
        "selection": "moves",
        "limit": 25,
        "after": 5,
        "oldest_first": True,
    }

    invalid = client.get("/api/history/pairs?limit=1000")
    assert invalid.status_code == 400


def test_history_pair_returns_compact_evidence(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("SRCVISUAL_HISTORY_REPOSITORY", str(tmp_path))
    monkeypatch.setattr(
        routes_module,
        "read_history_pair",
        lambda repository, pair_number: {
            "schema_version": 1,
            "pair": {"number": pair_number, "moves": []},
        },
    )

    client = create_app().test_client()
    response = client.get("/api/history/pairs/42")

    assert response.status_code == 200
    assert response.get_json()["pair"]["number"] == 42


def test_history_pair_visualization_materializes_and_builds_payload(
    monkeypatch,
    tmp_path: Path,
) -> None:
    artifact = tmp_path / "srcmove.xml"
    artifact.write_bytes(b"<unit />")
    producer_results = {"move_count": 0, "moves": [], "groups_total": 4}
    captured: dict[str, object] = {}
    monkeypatch.setenv("SRCVISUAL_HISTORY_REPOSITORY", str(tmp_path))
    monkeypatch.setattr(
        routes_module,
        "materialize_history_pair",
        lambda repository, pair_number: artifact,
    )
    monkeypatch.setattr(
        routes_module,
        "read_materialized_move_results",
        lambda artifact_path: producer_results,
    )

    def fake_build_visualization_payload(**kwargs) -> VisualizationPayload:
        captured.update(kwargs)
        return VisualizationPayload(
            source_filename="history-pair-13.srcmove.xml",
            moved_srcdiff_xml="<unit />",
            move_results={"move_count": 0, "moves": []},
            has_position_data=False,
            files=(),
        )

    monkeypatch.setattr(
        routes_module,
        "build_visualization_payload",
        fake_build_visualization_payload,
    )

    client = create_app().test_client()
    response = client.post(
        "/api/history/pairs/13/visualize",
        data={"pruning_level": "none"},
    )

    assert response.status_code == 200
    assert captured["filename"] == "history-pair-13.srcmove.xml"
    assert captured["payload"] == b"<unit />"
    assert captured["pruning_level"] == "none"
    assert captured["producer_move_results"] == producer_results
    assert captured["provenance"] == ArtifactProvenance(
        origin="history",
        history_pair=13,
        move_results_source="provided",
    )


def test_visualize_returns_move_results(monkeypatch) -> None:
    captured_kwargs: dict[str, object] = {}

    def fake_build_visualization_payload(**kwargs) -> VisualizationPayload:
        captured_kwargs.update(kwargs)
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
                        revision_0_filename="before/a.cpp",
                        revision_1_filename="after/a.cpp",
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
        data={
            "srcdiff_xml": "<unit />",
            "pruning_level": "none",
        },
    )

    assert response.status_code == 200
    assert captured_kwargs["pruning_level"] == "none"
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
    assert response.get_json()["files"] == [
        {
            "unit_id": 1,
            "filename": "a.cpp",
            "revision_0_filename": "before/a.cpp",
            "revision_1_filename": "after/a.cpp",
            "language": "C++",
            "revision_0_source_code": "int a;\n",
            "revision_1_source_code": "int a;\n",
            "tree": None,
        }
    ]
