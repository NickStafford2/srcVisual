from pathlib import Path

import pytest
from tests.schema3_fixtures import schema3_results

from srcdiffvisual.artifacts.projections import read_artifact_move, read_artifact_manifest
from srcdiffvisual.artifacts.store import read_artifact
from srcdiffvisual.srcmove.existing_annotations import (
    build_move_results_from_moved_srcdiff,
)
from srcdiffvisual.workflow.payload import build_visualization_artifact


@pytest.mark.parametrize("archive", [False, True])
def test_xml_only_annotations_survive_empty_producer_reports(tmp_path, archive):
    _xml = (Path(__file__).parents[2] / "examples/e2e_custom_two_independent_groups.xml").read_text()
    if archive:
        _xml = _xml.split("?>", 1)[1].strip()
        _xml = f'<unit xmlns="http://www.srcML.org/srcML/src" url="archive">{_xml}</unit>'
    _results = schema3_results()
    _published = build_visualization_artifact(
        filename="inherited.xml", payload=_xml.encode(), artifact_root=tmp_path,
        producer_move_results=_results,
    )
    _stored = read_artifact(artifact_root=tmp_path, artifact_id=_published.artifact_id)
    assert _stored.manifest["moves"]["move_count"] == 2
    assert _stored.payload.move_results["producer_metadata"]["summary"]["output_item_count"] == 0
    for _move in _stored.payload.move_results["moves"]:
        assert _move["result_provenance"] == "xml-annotation"
        assert "content_relationship" not in _move
        assert read_artifact_move(
            artifact_root=tmp_path, artifact_id=_published.artifact_id,
            move_id=_move["move_id"],
        )["move"]["move_id"] == _move["move_id"]


@pytest.mark.parametrize("archive", [False, True])
def test_compound_reporting_survives_complete_artifact_pipeline(tmp_path, archive):
    # Hand-authored structural children, preserving atomic XML annotations.
    xml = '<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" xmlns:mv="http://www.srcML.org/srcMove" filename="two_groups.cpp"><diff:delete><expr_stmt mv:id="a" mv:to="/src:unit[1]/diff:insert[1]/src:expr_stmt[1]">a();</expr_stmt><expr_stmt mv:id="b" mv:to="/src:unit[1]/diff:insert[1]/src:expr_stmt[2]">b();</expr_stmt></diff:delete><diff:insert><expr_stmt mv:id="a" mv:from="/src:unit[1]/diff:delete[1]/src:expr_stmt[1]">a();</expr_stmt><expr_stmt mv:id="b" mv:from="/src:unit[1]/diff:delete[1]/src:expr_stmt[2]">b();</expr_stmt></diff:insert></unit>'
    if archive:
        xml = '<unit xmlns="http://www.srcML.org/srcML/src" url="archive">' + xml + '</unit>'
    results = build_move_results_from_moved_srcdiff(
        moved_srcdiff_xml=xml, include_skipped_tags=True,
    )
    members = results["moves"]
    assert len(members) == 2
    for member in members:
        member["content_relationship"] = "type1"
    report = {
        "move_id": "sequence:" + members[0]["move_id"],
        "report_kind": "ordered_sequence",
        "content_relationship": "type1",
        "member_move_ids": [member["move_id"] for member in members],
        **{key: [value for member in members for value in member[key]]
           for key in ("from_xpaths", "to_xpaths", "from_raw_texts", "to_raw_texts")},
    }
    results = schema3_results(members, sequence=True)
    for group in results["atomic_move_groups"]:
        for side in ("original", "modified"):
            group[side][0]["revision_file"] = "two_groups.cpp"
    for side in ("original", "modified"):
        results["output_items"][0]["sequence"][side]["revision_file"] = "two_groups.cpp"
        results["output_items"][0]["sequence"][side]["parent_id"] = f"two_groups.cpp:{side}:unit:{int(archive)}"
    published = build_visualization_artifact(
        filename="compound.xml", payload=xml.encode(), artifact_root=tmp_path,
        producer_move_results=results,
    )
    _manifest = read_artifact_manifest(artifact_root=tmp_path, artifact_id=published.artifact_id)
    assert _manifest["files"][0]["diff_region_counts"] == {"delete": 1, "insert": 1}
    stored = read_artifact(artifact_root=tmp_path, artifact_id=published.artifact_id)
    summary = stored.manifest["moves"]
    assert summary["move_count"] == 1
    assert summary["items"][0]["member_move_ids"] == report["member_move_ids"]
    assert len(summary["items"][0]["from_node_ids"]) == 2
    assert len(summary["items"][0]["to_node_ids"]) == 2
    assert len(stored.payload.move_results["moves"]) == 2
    detail = read_artifact_move(
        artifact_root=tmp_path, artifact_id=published.artifact_id, move_id=report["move_id"],
    )["move"]
    assert detail["from_raw_texts"] == report["from_raw_texts"]
    assert detail["to_raw_texts"] == report["to_raw_texts"]
    for member in members:
        assert read_artifact_move(
            artifact_root=tmp_path, artifact_id=published.artifact_id,
            move_id=member["move_id"],
        )["move"]["move_id"] == member["move_id"]


@pytest.mark.parametrize("archive", [False, True])
def test_same_element_upstream_and_srcmove_annotations_remain_separate(tmp_path, archive):
    from srcdiffvisual.artifacts.projections import (
        read_artifact_manifest, read_artifact_xml, read_source_projection,
        read_tree_projection,
    )

    _xml = (Path(__file__).parents[2] / "examples/e2e_custom_pre_marked_move_small.xml").read_text()
    if archive:
        _xml = _xml.split("?>", 1)[1].strip()
        _xml = f'<unit xmlns="http://www.srcML.org/srcML/src" url="archive">{_xml}</unit>'
    _published = build_visualization_artifact(
        filename="both-layers.xml", payload=_xml.encode(), artifact_root=tmp_path,
    )
    _artifact_path = tmp_path / _published.artifact_id
    _before = {str(_path): _path.read_bytes() for _path in _artifact_path.rglob("*") if _path.is_file()}
    _args = {"artifact_root": tmp_path, "artifact_id": _published.artifact_id}
    _manifest = read_artifact_manifest(**_args)
    assert {_item["move_id"]: _item["move_origin"] for _item in _manifest["moves"]["items"]} == {
        "97b1dcdaf": "srcmove", "1": "srcdiff",
    }
    _file_id = _manifest["files"][0]["file_id"]
    _xml_projection = read_artifact_xml(**_args)
    _source = read_source_projection(**_args, file_id=_file_id, focus_profile="moves")
    _tree = read_tree_projection(**_args, file_id=_file_id, focus_profile="moves")
    _detail = read_artifact_move(**_args, move_id="1")["move"]
    assert _detail["move_origin"] == "srcdiff"
    assert _detail["from_raw_texts"] == _detail["to_raw_texts"] == ["int a;"]
    assert len(_detail["from_node_ids"]) == len(_detail["to_node_ids"]) == 1
    for _node_id in _detail["from_node_ids"] + _detail["to_node_ids"]:
        assert {_anchor["move_origin"] for _anchor in _xml_projection["anchors"]
                if _anchor["node_id"] == _node_id} == {"srcmove", "srcdiff"}
    _anchors = [
        _anchor for _block in _source["blocks"] if _block["type"] == "hunk"
        for _row in _block["rows"] for _side in ("left", "right") if _row[_side]
        for _anchor in _row[_side]["anchors"]
    ]
    assert {_anchor["move_origin"] for _anchor in _anchors if _anchor["move_id"]} == {"srcmove", "srcdiff"}
    _moved_nodes = [_node for _node in _tree["root"]["children"] if _node["move_id"]]
    assert len(_moved_nodes) == 2
    for _node in _moved_nodes:
        assert {_annotation["move_origin"] for _annotation in _node["move_annotations"]} == {"srcmove", "srcdiff"}
    assert _before == {str(_path): _path.read_bytes() for _path in _artifact_path.rglob("*") if _path.is_file()}
