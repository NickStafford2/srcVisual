from copy import deepcopy

import pytest

from srcdiffvisual.srcmove.reported_moves import reported_move_records
from srcdiffvisual.artifacts.store import _build_move_summaries


def _fixture():
    _moves = [
        {
            "move_id": _id, "content_relationship": "type1",
            "from_xpaths": [f"/old/{_id}"], "to_xpaths": [f"/new/{_id}"],
            "from_raw_texts": [f"{_id}();"], "to_raw_texts": [f"{_id}();"],
            "from_node_ids": [f"/old/{_id}"], "to_node_ids": [f"/new/{_id}"],
        }
        for _id in ("a", "b")
    ]
    _report = {
        "move_id": "sequence:a", "report_kind": "ordered_sequence",
        "content_relationship": "type1", "member_move_ids": ["a", "b"],
        **{_key: [_move[_key][0] for _move in _moves]
           for _key in ("from_xpaths", "to_xpaths", "from_raw_texts", "to_raw_texts")},
    }
    return {"moves": _moves, "producer_metadata": {
        "reported_moves": [_report], "reported_move_count": 1,
        "reported_content_relationships": {"type1": 1, "type2c": 0, "type3": 0},
    }}


def test_compound_report_uses_original_nodes_in_order_and_counts_once():
    _results = _fixture()
    _before = deepcopy(_results)
    _paths = {f"/{_side}/{_id}": f"{_side}:{_id}"
              for _side in ("old", "new") for _id in ("a", "b")}
    _summary = _build_move_summaries(_results, _paths)
    assert _summary == {"move_count": 1, "items": [{
        "move_id": "sequence:a", "report_kind": "ordered_sequence",
        "member_move_ids": ["a", "b"], "content_relationship": "type1",
        "from_node_ids": ["old:a", "old:b"], "to_node_ids": ["new:a", "new:b"],
    }]}
    assert _results == _before


def test_old_results_keep_atomic_reports():
    _results = _fixture()
    del _results["producer_metadata"]
    assert reported_move_records(_results) == _results["moves"]


def test_inherited_xml_annotations_remain_visible_outside_producer_reports():
    _results = _fixture()
    _annotation = {**deepcopy(_results["moves"][0]), "move_id": "inherited",
                   "result_provenance": "xml-annotation"}
    _annotation.pop("content_relationship")
    _results["moves"].append(_annotation)
    _projected = reported_move_records(_results)
    assert len(_projected) == 2
    assert _projected[0]["move_id"] == "sequence:a"
    assert _projected[1] == _annotation


@pytest.mark.parametrize("mutation", ["producer_unreported", "xml_member", "flat_provenance"])
def test_xml_provenance_cannot_relax_producer_partition(mutation):
    _results = _fixture()
    if mutation == "producer_unreported":
        _results["moves"].append({**deepcopy(_results["moves"][0]), "move_id": "unreported",
                                 "result_provenance": "producer-results"})
    elif mutation == "xml_member":
        _results["moves"][0]["result_provenance"] = "xml-annotation"
    else:
        _results.update(_results.pop("producer_metadata"))
        _results["moves"].append({**deepcopy(_results["moves"][0]), "move_id": "unreported",
                                 "result_provenance": "xml-annotation"})
    with pytest.raises(ValueError, match="partition"):
        reported_move_records(_results)


@pytest.mark.parametrize("mutation", ["missing", "duplicate", "reordered", "count", "category", "fanout"])
def test_invalid_compound_contract_is_rejected(mutation):
    _results = _fixture()
    _metadata = _results["producer_metadata"]
    _report = _metadata["reported_moves"][0]
    if mutation == "missing":
        _report["member_move_ids"] = ["a", "absent"]
    elif mutation == "duplicate":
        _report["member_move_ids"] = ["a", "a"]
    elif mutation == "reordered":
        _report["to_xpaths"].reverse()
    elif mutation == "count":
        _metadata["reported_move_count"] = 2
    elif mutation == "category":
        _report["content_relationship"] = "type3"
    elif mutation == "fanout":
        _results["moves"][0]["from_node_ids"].append("/other")
    with pytest.raises(ValueError):
        reported_move_records(_results)


@pytest.mark.parametrize("mutation", ["duplicate_atomic", "incomplete", "boolean_count", "boolean_category", "kind_list", "duplicate_full"])
def test_additional_contract_guards(mutation):
    _results = _fixture()
    _metadata = _results["producer_metadata"]
    if mutation == "duplicate_atomic":
        _results["moves"].append(deepcopy(_results["moves"][0]))
    elif mutation == "incomplete":
        del _metadata["reported_moves"]
    elif mutation == "boolean_count":
        _metadata["reported_move_count"] = True
    elif mutation == "boolean_category":
        _metadata["reported_content_relationships"]["type1"] = True
    elif mutation == "kind_list":
        _metadata["reported_moves"][0]["report_kind"] = []
    elif mutation == "duplicate_full":
        _metadata["reported_moves"][0]["member_move_ids"] = ["a", "b", "a"]
    with pytest.raises(ValueError):
        reported_move_records(_results)


def test_atomic_report_cannot_change_classification_or_canonical_nodes():
    _move = _fixture()["moves"][0]
    _report = {**_move, "report_kind": "atomic", "member_move_ids": ["a"],
               "from_node_ids": ["invented"]}
    _results = {"moves": [_move], "reported_moves": [_report], "reported_move_count": 1,
                "reported_content_relationships": {"type1": 1, "type2c": 0, "type3": 0}}
    assert reported_move_records(_results)[0]["from_node_ids"] == _move["from_node_ids"]
    _report["content_relationship"] = "type3"
    with pytest.raises(ValueError):
        reported_move_records(_results)
