from __future__ import annotations

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.artifacts.projections import (
    read_artifact_node,
    read_artifact_manifest,
    read_artifact_xml,
    read_node_children,
    read_source_projection,
    read_tree_projection,
)
from srcvisual.artifacts.store import publish_artifact
from srcvisual.files.models import RevisionFile, VisualizedFile
from srcvisual.workflow.models import VisualizationPayload


def test_manifest_and_xml_are_separate_projections(tmp_path) -> None:
    published = _publish_fixture(tmp_path)

    manifest = read_artifact_manifest(
        artifact_root=tmp_path, artifact_id=published.artifact_id
    )
    xml = read_artifact_xml(artifact_root=tmp_path, artifact_id=published.artifact_id)

    assert manifest["projection_schema_version"] == 1
    assert manifest["focus_profiles"] == [
        "changes-and-moves",
        "moves",
        "changes",
        "complete-file",
    ]
    assert "xml" not in manifest
    assert xml["xml"] == (
        '<unit filename="example.cpp">\n'
        "  <delete>old();</delete>\n"
        "  <insert>new();</insert>\n"
        '  <move id="move-1">moved();</move>\n'
        "</unit>\n"
    )
    assert xml["anchors"] == [
        {
            "node_id": f'{manifest["files"][0]["file_id"]}:n00000001',
            "kind": "delete",
            "move_id": None,
            "span": {
                "start_line": 2,
                "start_col": 3,
                "end_line": 2,
                "end_col": 25,
            },
        },
        {
            "node_id": f'{manifest["files"][0]["file_id"]}:n00000002',
            "kind": "insert",
            "move_id": None,
            "span": {
                "start_line": 3,
                "start_col": 3,
                "end_line": 3,
                "end_col": 25,
            },
        },
        {
            "node_id": f'{manifest["files"][0]["file_id"]}:n00000003',
            "kind": "move",
            "move_id": "move-1",
            "span": {
                "start_line": 4,
                "start_col": 3,
                "end_line": 4,
                "end_col": 36,
            },
        },
    ]


def test_source_projection_aligns_rows_and_makes_gaps_explicit(tmp_path) -> None:
    published = _publish_fixture(tmp_path)
    file_id = published.manifest["files"][0]["file_id"]

    projection = read_source_projection(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        file_id=file_id,
        focus_profile="changes",
        context_lines=0,
    )

    assert [block["type"] for block in projection["blocks"]] == [
        "gap",
        "hunk",
        "gap",
    ]
    hunk = projection["blocks"][1]
    assert hunk["rows"] == [
        {
            "kind": "replace",
            "left": {
                "line_number": 2,
                "text": "old();",
                "anchors": [
                    {
                        "node_id": f"{file_id}:n00000001",
                        "kind": "delete",
                        "move_id": None,
                        "span": {
                            "start_line": 2,
                            "start_col": 1,
                            "end_line": 2,
                            "end_col": 6,
                        },
                    }
                ],
            },
            "right": {
                "line_number": 2,
                "text": "new();",
                "anchors": [
                    {
                        "node_id": f"{file_id}:n00000002",
                        "kind": "insert",
                        "move_id": None,
                        "span": {
                            "start_line": 2,
                            "start_col": 1,
                            "end_line": 2,
                            "end_col": 6,
                        },
                    }
                ],
            },
        }
    ]
    assert projection["blocks"][0]["left"] == {
        "start_line": 1,
        "end_line": 1,
        "line_count": 1,
    }


def test_source_projection_supports_bounded_revision_ranges(tmp_path) -> None:
    published = _publish_fixture(tmp_path)
    file_id = published.manifest["files"][0]["file_id"]

    projection = read_source_projection(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        file_id=file_id,
        left_range=(4, 4),
        right_range=(4, 4),
    )

    hunks = [block for block in projection["blocks"] if block["type"] == "hunk"]
    assert len(hunks) == 1
    assert hunks[0]["rows"][0]["left"]["text"] == "moved();"
    assert hunks[0]["rows"][0]["right"]["text"] == "moved();"


def test_source_projection_returns_character_precise_move_anchors(tmp_path) -> None:
    published = _publish_fixture(tmp_path)
    file_id = published.manifest["files"][0]["file_id"]

    projection = read_source_projection(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        file_id=file_id,
        focus_profile="moves",
        context_lines=0,
    )

    hunk = next(block for block in projection["blocks"] if block["type"] == "hunk")
    for side in ("left", "right"):
        assert hunk["rows"][0][side]["anchors"] == [
            {
                "node_id": f"{file_id}:n00000003",
                "kind": "move",
                "move_id": "move-1",
                "span": {
                    "start_line": 4,
                    "start_col": 1,
                    "end_line": 4,
                    "end_col": 8,
                },
            }
        ]


def test_source_projection_accumulates_expanded_ranges_with_focus(tmp_path) -> None:
    published = _publish_fixture(tmp_path)
    file_id = published.manifest["files"][0]["file_id"]

    projection = read_source_projection(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        file_id=file_id,
        focus_profile="changes",
        context_lines=0,
        expanded_ranges=(((4, 4), (4, 4)),),
    )

    hunks = [block for block in projection["blocks"] if block["type"] == "hunk"]
    assert [[row["left"]["text"] for row in hunk["rows"]] for hunk in hunks] == [
        ["old();"],
        ["moved();"],
    ]


def test_tree_projection_is_bounded_and_children_are_pageable(tmp_path) -> None:
    published = _publish_fixture(tmp_path)
    file_manifest = published.manifest["files"][0]
    file_id = file_manifest["file_id"]

    projection = read_tree_projection(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        file_id=file_id,
        focus_profile="changes-and-moves",
        node_limit=2,
    )

    assert projection["node_count"] == 2
    assert projection["truncated"] is True
    assert projection["root"]["node_id"] == file_manifest["root_node_id"]
    assert projection["root"]["child_count"] == 3
    assert projection["root"]["children_complete"] is False

    children = read_node_children(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        node_id=file_manifest["root_node_id"],
        offset=1,
        limit=1,
    )
    assert children["children"][0]["kind"] == "insert"
    assert children["next_offset"] == 2

    node = read_artifact_node(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        node_id=children["children"][0]["node_id"],
    )
    assert node["schema_version"] == 1
    assert node["node"]["kind"] == "insert"
    assert node["node"]["revision_1_span"]["start_line"] == 2


def _publish_fixture(tmp_path):
    def node(
        path: str,
        kind: str,
        *,
        move_id: str | None = None,
        xml_span=None,
        revision_0_span=None,
        revision_1_span=None,
        children=(),
    ):
        return {
            "id": path,
            "path": path,
            "tag": "expr_stmt",
            "label": path.rsplit("/", 1)[-1],
            "kind": kind,
            "move_id": move_id,
            "srcdiff_attributes": {},
            "xml_span": xml_span,
            "revision_0_span": revision_0_span,
            "revision_1_span": revision_1_span,
            "children": list(children),
        }

    deleted = node(
        "/unit/delete",
        "delete",
        xml_span={"start_line": 2, "start_col": 3, "end_line": 2, "end_col": 25},
        revision_0_span={"start_line": 2, "start_col": 1, "end_line": 2, "end_col": 6},
    )
    inserted = node(
        "/unit/insert",
        "insert",
        xml_span={"start_line": 3, "start_col": 3, "end_line": 3, "end_col": 25},
        revision_1_span={"start_line": 2, "start_col": 1, "end_line": 2, "end_col": 6},
    )
    moved = node(
        "/unit/move",
        "move",
        move_id="move-1",
        xml_span={"start_line": 4, "start_col": 3, "end_line": 4, "end_col": 36},
        revision_0_span={"start_line": 4, "start_col": 1, "end_line": 4, "end_col": 8},
        revision_1_span={"start_line": 4, "start_col": 1, "end_line": 4, "end_col": 8},
    )
    root = node("/unit", "plain", children=(deleted, inserted, moved))
    payload = VisualizationPayload(
        source_filename="example.srcmove.xml",
        moved_srcdiff_xml=(
            '<unit filename="example.cpp">\n'
            "  <delete>old();</delete>\n"
            "  <insert>new();</insert>\n"
            '  <move id="move-1">moved();</move>\n'
            "</unit>\n"
        ),
        move_results={"move_count": 0, "moves": []},
        has_position_data=True,
        files=(
            VisualizedFile(
                revision_file=RevisionFile(
                    unit_id=1,
                    filename="example.cpp",
                    revision_0_filename="before/example.cpp",
                    revision_1_filename="after/example.cpp",
                    language="C++",
                    revision_0_source_code="zero();\nold();\nsame();\nmoved();\n",
                    revision_1_source_code="zero();\nnew();\nsame();\nmoved();\n",
                ),
                tree=root,
            ),
        ),
    )
    return publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=payload,
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )
