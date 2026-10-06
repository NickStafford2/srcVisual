from pathlib import Path

import pytest

from srcdiffvisual.artifacts.projections import read_artifact_move
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
        _xml = f'<unit xmlns="http://www.srcML.org/srcML/src">{_xml}</unit>'
    _counts = {"type1": 0, "type2c": 0, "type3": 0}
    _results = {
        "results_schema_version": 2, "moves": [], "move_count": 0,
        "content_relationships": _counts,
        "reported_moves": [], "reported_move_count": 0,
        "reported_content_relationships": _counts,
    }
    _published = build_visualization_artifact(
        filename="inherited.xml", payload=_xml.encode(), artifact_root=tmp_path,
        producer_move_results=_results,
    )
    _stored = read_artifact(artifact_root=tmp_path, artifact_id=_published.artifact_id)
    assert _stored.manifest["moves"]["move_count"] == 2
    assert _stored.payload.move_results["producer_metadata"]["reported_move_count"] == 0
    for _move in _stored.payload.move_results["moves"]:
        assert _move["result_provenance"] == "xml-annotation"
        assert "content_relationship" not in _move
        assert read_artifact_move(
            artifact_root=tmp_path, artifact_id=_published.artifact_id,
            move_id=_move["move_id"],
        )["move"]["move_id"] == _move["move_id"]


@pytest.mark.parametrize("archive", [False, True])
def test_compound_reporting_survives_complete_artifact_pipeline(tmp_path, archive):
    # Consumer contract fixture: original XML annotations remain atomic.
    xml = (Path(__file__).parents[2] / "examples/e2e_custom_two_independent_groups.xml").read_text()
    if archive:
        xml = xml.split("?>", 1)[1].strip()
        xml = f'<unit xmlns="http://www.srcML.org/srcML/src">{xml}</unit>'
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
    results.update({
        "results_schema_version": 2,
        "content_relationships": {"type1": 2, "type2c": 0, "type3": 0},
        "reported_moves": [report],
        "reported_move_count": 1,
        "reported_content_relationships": {"type1": 1, "type2c": 0, "type3": 0},
    })
    published = build_visualization_artifact(
        filename="compound.xml", payload=xml.encode(), artifact_root=tmp_path,
        producer_move_results=results,
    )
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
