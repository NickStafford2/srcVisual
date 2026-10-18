from __future__ import annotations

import pytest

from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.projections import (
    _include_short_source_gaps,
    read_artifact_move,
    read_artifact_node,
    read_artifact_manifest,
    read_artifact_xml,
    read_node_children,
    read_source_projection,
    read_tree_projection,
)
from srcdiffvisual.artifacts.store import publish_artifact
from srcdiffvisual.files.models import RevisionFile, VisualizedFile
from srcdiffvisual.workflow.models import VisualizationPayload


def test_manifest_and_xml_are_separate_projections(tmp_path) -> None:
    published = _publish_fixture(tmp_path)

    manifest = read_artifact_manifest(
        artifact_root=tmp_path, artifact_id=published.artifact_id
    )
    xml = read_artifact_xml(artifact_root=tmp_path, artifact_id=published.artifact_id)

    assert manifest["projection_schema_version"] == 2
    assert manifest["focus_profiles"] == [
        "changes-and-moves",
        "moves",
        "changes",
        "complete-file",
    ]
    assert "xml" not in manifest
    assert xml["xml"] == (
        '<unit xmlns:mv="http://www.srcML.org/srcMove" filename="example.cpp">\n'
        "  <delete>old();</delete>\n"
        "  <insert>new();</insert>\n"
        '  <move mv:id="move-1">moved();</move>\n'
        "</unit>\n"
    )
    assert xml["anchors"] == [
        {
            "node_id": f"{manifest['files'][0]['file_id']}:n00000001",
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
            "node_id": f"{manifest['files'][0]['file_id']}:n00000002",
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
            "node_id": f"{manifest['files'][0]['file_id']}:n00000003",
            "kind": "move",
            "move_id": "move-1",
            "move_origin": "srcmove",
            "span": {
                "start_line": 4,
                "start_col": 3,
                "end_line": 4,
                "end_col": 36,
            },
        },
    ]


def test_move_projection_returns_record_without_interpreting_it(tmp_path) -> None:
    published = _publish_fixture(tmp_path)

    projection = read_artifact_move(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        move_id="move-1",
    )

    assert projection == {
        "schema_version": 2,
        "artifact_id": published.artifact_id,
        "results_schema_version": 3,
        "move": {
            "move_id": "move-1",
            "move_origin": "srcmove",
            "content_relationship": "type1",
            "confidence_milli": 1000,
            "selection_utility": 8000,
            "matched_units": 8,
            "selection_reason": "greedy_utility",
            "from_xpaths": ["/unit/move"],
            "to_xpaths": ["/unit/move"],
            "from_raw_texts": ["moved();"],
            "to_raw_texts": ["moved();"],
            "from_node_ids": ["/unit/move"],
            "to_node_ids": ["/unit/move"],
        },
    }


def test_source_projection_aligns_rows_and_reveals_short_gaps(tmp_path) -> None:
    published = _publish_fixture(tmp_path)
    file_id = published.manifest["files"][0]["file_id"]

    projection = read_source_projection(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
        file_id=file_id,
        focus_profile="changes",
        context_lines=0,
    )

    assert [block["type"] for block in projection["blocks"]] == ["hunk"]
    hunk = projection["blocks"][0]
    assert [row["left"]["line_number"] for row in hunk["rows"]] == [1, 2, 3, 4]
    assert [row for row in hunk["rows"] if row["kind"] == "replace"] == [
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
        assert next(row for row in hunk["rows"] if row[side]["line_number"] == 4)[side]["anchors"] == [
            {
                "node_id": f"{file_id}:n00000003",
                "kind": "move",
                "move_id": "move-1",
                "move_origin": "srcmove",
                "span": {
                    "start_line": 4,
                    "start_col": 1,
                    "end_line": 4,
                    "end_col": 8,
                },
            }
        ]


def test_source_projection_repeats_one_multiline_endpoint_on_every_source_line(
    tmp_path,
) -> None:
    _span = {"start_line": 2, "start_col": 7, "end_line": 4, "end_col": 5}
    _move = {
        "id": "/unit/move",
        "path": "/unit/move",
        "tag": "block",
        "label": "block",
        "kind": "move",
        "move_id": "move-1",
        "move_origin": "srcmove",
        "srcdiff_attributes": {},
        "xml_span": None,
        "revision_0_span": _span,
        "revision_1_span": _span,
        "children": [],
    }
    _root = {
        "id": "/unit",
        "path": "/unit",
        "tag": "unit",
        "label": "unit: example.cpp",
        "kind": "plain",
        "move_id": None,
        "srcdiff_attributes": {},
        "xml_span": None,
        "revision_0_span": _span,
        "revision_1_span": _span,
        "children": [_move],
    }
    _source = "before\nprefix moved\n\nafter tail\nlast\n"
    _payload = VisualizationPayload(
        source_filename="multiline.srcmove.xml",
        moved_srcdiff_xml='<unit xmlns:mv="http://www.srcML.org/srcMove" filename="example.cpp" mv:id="move-1"/>\n',
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
                    revision_0_source_code=_source,
                    revision_1_source_code=_source,
                ),
                tree=_root,
            ),
        ),
    )
    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=_payload,
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )
    _file_id = _published.manifest["files"][0]["file_id"]

    _projection = read_source_projection(
        artifact_root=tmp_path,
        artifact_id=_published.artifact_id,
        file_id=_file_id,
        focus_profile="moves",
        context_lines=0,
    )

    _hunk = next(_block for _block in _projection["blocks"] if _block["type"] == "hunk")
    assert [
        (_row["left"]["line_number"], _row["left"]["text"]) for _row in _hunk["rows"] if _row["left"]["anchors"]
    ] == [(2, "prefix moved"), (3, ""), (4, "after tail")]
    for _row in _hunk["rows"]:
        if _row["left"]["line_number"] not in (2, 3, 4):
            continue
        for _side in ("left", "right"):
            assert _row[_side]["anchors"] == [
                {
                    "node_id": f"{_file_id}:n00000001",
                    "kind": "move",
                    "move_id": "move-1",
                    "move_origin": "srcmove",
                    "span": _span,
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
    assert len(hunks) == 1
    assert [row["left"]["line_number"] for row in hunks[0]["rows"]] == [1, 2, 3, 4]
    assert {row["left"]["text"] for row in hunks[0]["rows"]} >= {"old();", "moved();"}


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


def _publish_fixture(tmp_path, diagnostics=None):
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
            '<unit xmlns:mv="http://www.srcML.org/srcMove" filename="example.cpp">\n'
            "  <delete>old();</delete>\n"
            "  <insert>new();</insert>\n"
            '  <move mv:id="move-1">moved();</move>\n'
            "</unit>\n"
        ),
        move_results={
            "move_count": 1,
            "moves": [
                {
                    "move_id": "move-1",
                    "move_origin": "srcmove",
                    "content_relationship": "type1",
                    "confidence_milli": 1000,
                    "selection_utility": 8000,
                    "matched_units": 8,
                    "selection_reason": "greedy_utility",
                    "from_xpaths": ["/unit/move"],
                    "to_xpaths": ["/unit/move"],
                    "from_raw_texts": ["moved();"],
                    "to_raw_texts": ["moved();"],
                    "from_node_ids": ["/unit/move"],
                    "to_node_ids": ["/unit/move"],
                }
            ],
            "producer_metadata": {
                "results_schema_version": 3,
                **({"diagnostics": diagnostics} if diagnostics is not None else {}),
            },
        },
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
    from tests.schema3_fixtures import schema3_results
    payload.move_results['producer_metadata'] = schema3_results(payload.move_results['moves'], diagnostics=diagnostics)
    return publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=payload,
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )


def test_correspondence_pages_and_snippets_preserve_nonmove_evidence(tmp_path):
    from srcdiffvisual.artifacts.correspondences import (
        read_correspondences,
        read_correspondence,
    )

    _diagnostics = _diagnostic_fixture()
    _artifact = _publish_fixture(tmp_path, diagnostics=_diagnostics)
    _args = {"artifact_root": tmp_path, "artifact_id": _artifact.artifact_id}
    _page = read_correspondences(**_args, limit=1)
    assert _page["available"] is True
    assert _page["next_offset"] == 1
    assert _page["total"] == 2
    assert "raw_text" not in str(_page)
    assert read_correspondences(**_args, offset=1, limit=1)["items"][0]["id"] == "pair:selected"
    _filtered = read_correspondences(
        **_args,
        query="OLD.CPP",
        kind="type1",
        outcome="not_selected_pair",
        classification="stationary",
    )
    assert _filtered["matched"] == 1
    assert _filtered["items"][0]["outcome"] == "not_selected_pair"
    _detail = read_correspondence(**_args, index="pair:stationary")
    assert _detail["before"]["text_truncated"] is True
    assert len(_detail["before"]["raw_text"]) == 20000
    assert _detail["after"]["raw_text"] == "after();"
    assert _detail["evidence"]["location"]["reason"] == "same_anchor_interval"


def test_correspondences_distinguish_missing_empty_and_unsupported(tmp_path):
    import pytest
    from srcdiffvisual.artifacts.correspondences import read_correspondences

    _missing = _publish_fixture(tmp_path)
    assert (
        read_correspondences(artifact_root=tmp_path, artifact_id=_missing.artifact_id)[
            "available"
        ]
        is False
    )
    _empty = _publish_fixture(
        tmp_path,
        diagnostics=_diagnostic_fixture(empty=True),
    )
    _page = read_correspondences(artifact_root=tmp_path, artifact_id=_empty.artifact_id)
    assert _page["available"] is True and _page["total"] == 0
    with pytest.raises(ValueError):
        _publish_fixture(tmp_path, diagnostics={'schema_version': 999})


def _diagnostic_fixture(empty=False):
    def context(filename):
        return {'revision_file': filename, 'semantic_container_id': None,
                'semantic_container_label': None, 'previous_common_anchor_id': None,
                'next_common_anchor_id': None, 'meaningful_ancestors': [],
                'ancestor_summary_interpretable': False, 'structural_region_id': None,
                'structural_region_mapped': False, 'common_sibling_prefix_count': 0,
                'common_sibling_suffix_begin': 0, 'anchor_region_id': None}
    candidates = [
        {'candidate_id': i, 'revision': side, 'role': 'diff_wrapper',
         'selected_group_id': 'move-1', 'endpoint': None, 'type3_eligible': False,
         'line_units': 1, 'token_units': 1}
        for i, side in [(0, 'original'), (1, 'modified')]]
    pairs = []
    if not empty:
        for i, side, text in [(2, 'original', 'x' * 20001), (3, 'modified', 'after();')]:
            candidates.append({'candidate_id': i, 'revision': side, 'role': 'diff_wrapper',
                               'selected_group_id': None, 'type3_eligible': False,
                               'line_units': 1, 'token_units': 1,
                               'endpoint': {'candidate_id': i, 'revision_file': 'old.cpp',
                                            'xpath': '/src:unit[1]/diff:delete[1]' if i == 2 else '/src:unit[1]/diff:insert[1]',
                                            'construct': 'function', 'raw_text': text}})
        for selected in (False, True):
            pairs.append({'id': 'pair:selected' if selected else 'pair:stationary',
                          'original_candidate_id': 0 if selected else 2,
                          'modified_candidate_id': 1 if selected else 3,
                          'content_relationship': 'type1', 'name_evidence': 'not_assessed',
                          'location': {'scope': 'pair', 'classification': 'relocated' if selected else 'stationary',
                                       'reason': 'different_file' if selected else 'same_anchor_interval',
                                       'observations': {'file': 'different' if selected else 'same',
                                                        'semantic_container': 'unknown', 'anchor_interval': 'unknown',
                                                        'relative_order': 'unknown', 'ancestor': 'unknown'},
                                       'carried_by_parent': False, 'parent_pair': None},
                          'original_context': context('original.cpp' if selected else 'old.cpp'),
                          'modified_context': context('modified.cpp' if selected else 'old.cpp'),
                          'verified_partner_counts': None,
                          'selection': {'status': 'selected_pair' if selected else 'not_selected_pair',
                                        'selected_group_id': 'move-1' if selected else None}})
    return {'schema_version': 5, 'candidate_counts': {'registered': len(candidates), 'active': len(candidates)},
            'candidates': candidates, 'correspondences': pairs, 'type3_comparisons': [], 'type2b_groups': []}


def test_projection_origins_use_xml_namespaces_without_rewriting_saved_artifact(tmp_path):
    from srcdiffvisual.artifacts.projections import _with_move_origins

    _xml = b'''<unit xmlns:s="http://www.srcML.org/srcMove">
      <delete move="1"><decl s:id="a">old</decl></delete>
      <insert move="1"><decl s:id="a">new</decl></insert>
      <delete s:id="xml-only">other</delete>
    </unit>'''
    _path = tmp_path / "annotated.xml"
    _path.write_bytes(_xml)
    _payload = {
        "moves": {"items": [
            {"move_id": "item:a", "member_move_ids": ["a"]},
            {"move_id": "1"},
            {"move_id": "xml-only", "result_provenance": "xml-annotation"},
        ]},
        "anchors": [{"move_id": "a"}, {"move_id": "1"}],
        "root": {"move_id": None, "children": [{"move_id": "a"}]},
    }

    _result = _with_move_origins(_payload, tmp_path)

    assert [_item["move_origin"] for _item in _result["moves"]["items"]] == [
        "srcmove", "srcdiff", "srcmove",
    ]
    assert [_anchor["move_origin"] for _anchor in _result["anchors"]] == [
        "srcmove", "srcdiff",
    ]
    assert _result["root"]["children"][0]["move_origin"] == "srcmove"
    assert "move_origin" not in _result["root"]
    assert _path.read_bytes() == _xml


def test_projection_origins_reject_missing_or_conflicting_xml_identity(tmp_path):
    import pytest
    from srcdiffvisual.artifacts.projections import _with_move_origins
    from srcdiffvisual.artifacts.store import ArtifactIntegrityError

    _path = tmp_path / "annotated.xml"
    _path.write_text('<unit/>')
    with pytest.raises(ArtifactIntegrityError, match="missing or conflicting"):
        _with_move_origins({"move_id": "absent"}, tmp_path)

    _path.write_text('''<unit xmlns:mv="http://www.srcML.org/srcMove">
        <delete move="1"/><insert mv:id="1"/></unit>''')
    with pytest.raises(ArtifactIntegrityError, match="shared by srcMove and srcDiff"):
        _with_move_origins({"move_id": "1"}, tmp_path)


@pytest.mark.parametrize("hidden_lines", [1, 2, 3, 4, 5])
@pytest.mark.parametrize("location", ["leading", "interior", "trailing"])
def test_short_gap_threshold_includes_file_edges(hidden_lines, location):
    _rows = [{"left": {"line_number": _i}, "right": {"line_number": _i}}
             for _i in range(hidden_lines + 2)]
    _selected = {"leading": [hidden_lines, hidden_lines + 1],
                 "interior": [0, hidden_lines + 1], "trailing": [0, 1]}[location]
    _result = _include_short_source_gaps(_rows, _selected)
    assert _result == (list(range(len(_rows))) if hidden_lines < 4 else _selected)


def test_short_gaps_keep_asymmetric_revision_rows_aligned():
    _rows = [{"left": None, "right": {"line_number": _i}} for _i in range(4)]
    assert _include_short_source_gaps(_rows, [3]) == [0, 1, 2, 3]
    assert _include_short_source_gaps(_rows, []) == []
    _rows[0]["left"] = {"line_number": 1}
    assert _include_short_source_gaps(_rows, []) == [0, 1, 2, 3]


def test_short_gap_expansion_respects_source_response_bound(tmp_path, monkeypatch):
    import srcdiffvisual.artifacts.projections as _projections

    _published = _publish_fixture(tmp_path)
    monkeypatch.setattr(_projections, "MAX_SOURCE_ROWS", 2)
    _projection = read_source_projection(
        artifact_root=tmp_path, artifact_id=_published.artifact_id,
        file_id=_published.manifest["files"][0]["file_id"],
        focus_profile="changes", context_lines=0,
    )
    assert _projection["truncated"]
    assert sum(len(_block["rows"]) for _block in _projection["blocks"]
               if _block["type"] == "hunk") == 2
