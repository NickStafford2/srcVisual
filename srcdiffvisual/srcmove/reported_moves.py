from __future__ import annotations

from typing import Any


def reported_move_records(move_results: dict[str, Any]) -> list[dict[str, Any]]:
    """Project producer reports onto retained XML endpoints, without new nodes."""
    _moves = move_results.get("moves")
    if not isinstance(_moves, list):
        raise ValueError("Canonical move results must contain a moves list.")
    _metadata = move_results.get("producer_metadata", move_results)
    if "results_schema_version" not in _metadata:
        return _moves
    from srcdiffvisual.srcmove.srcmove_results import validate_producer_results
    validate_producer_results(_metadata, allow_visualization_metadata=True)
    _reports = _metadata["output_items"]
    _by_id = {}
    _xml_only = []
    for _move in _moves:
        if (not isinstance(_move, dict) or not isinstance(_move.get("move_id"), str)
                or not _move["move_id"] or _move["move_id"] in _by_id):
            raise ValueError("Invalid or duplicate atomic move identity.")
        _by_id[_move["move_id"]] = _move
        if "producer_metadata" in move_results and _move.get("result_provenance") == "xml-annotation":
            _xml_only.append(_move)
    # The merger explicitly distinguishes annotations inherited from input XML
    # from moves emitted by this producer invocation. Only the latter belong
    # to the producer's report partition and classification counts.
    _producer_ids = set(_by_id) - {_move["move_id"] for _move in _xml_only}
    _seen: set[str] = set()
    _report_ids: set[str] = set()
    _projected = []
    for _report in _reports:
        if not isinstance(_report, dict):
            raise ValueError("Invalid move report.")
        _id = _report.get("id")
        _members = _report.get("member_group_ids")
        _kind = _report.get("kind")
        if (
            not isinstance(_id, str) or not _id or _id in _report_ids
            or not isinstance(_members, list) or not _members
            or any(not isinstance(_member, str) for _member in _members)
            or len(set(_members)) != len(_members)
            or not isinstance(_kind, str) or _kind not in {"atomic_move_group", "sequence_move_group"}
        ):
            raise ValueError("Invalid move report identity or members.")
        _report_ids.add(_id)
        if any(_member not in _producer_ids or _member in _seen for _member in _members):
            raise ValueError("Move reports must partition retained atomic moves.")
        _seen.update(_members)
        _records = [_by_id[_member] for _member in _members]
        if _kind == "atomic_move_group":
            _projected.append({
                **_records[0], "move_id": _id, "report_kind": "atomic",
                "member_move_ids": _members, "output_item": _report,
            })
            continue
        if any(len(_record.get(_key, [])) != 1 for _record in _records
               for _key in ("from_node_ids", "to_node_ids")):
            raise ValueError("Sequence item requires unique member endpoints.")
        _projected.append({
            "move_id": _id, "report_kind": "ordered_sequence",
            "member_move_ids": _members, "output_item": _report,
            "content_relationship": "type1",
            **{_key: [_record[_key][0] for _record in _records]
               for _key in ("from_node_ids", "to_node_ids", "from_xpaths",
                            "to_xpaths", "from_raw_texts", "to_raw_texts")},
        })
    if _seen != _producer_ids:
        raise ValueError("Move reports must partition retained atomic moves.")
    return [*_projected, *_xml_only]
