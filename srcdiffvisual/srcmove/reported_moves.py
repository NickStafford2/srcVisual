from __future__ import annotations

from typing import Any


def reported_move_records(move_results: dict[str, Any]) -> list[dict[str, Any]]:
    """Project producer reports onto retained XML endpoints, without new nodes."""
    _moves = move_results.get("moves")
    if not isinstance(_moves, list):
        raise ValueError("Canonical move results must contain a moves list.")
    _metadata = move_results.get("producer_metadata", move_results)
    if "reported_moves" not in _metadata:
        if any(_key in _metadata for _key in ("reported_move_count", "reported_content_relationships")):
            raise ValueError("Reported move metadata requires reported_moves.")
        return _moves
    _reports = _metadata["reported_moves"]
    if not isinstance(_reports, list):
        raise ValueError("reported_moves must be a list.")
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
        _id = _report.get("move_id")
        _members = _report.get("member_move_ids")
        _kind = _report.get("report_kind")
        if (
            not isinstance(_id, str) or not _id or _id in _report_ids
            or not isinstance(_members, list) or not _members
            or any(not isinstance(_member, str) for _member in _members)
            or len(set(_members)) != len(_members)
            or not isinstance(_kind, str) or _kind not in {"atomic", "ordered_sequence"}
        ):
            raise ValueError("Invalid move report identity or members.")
        _report_ids.add(_id)
        if any(_member not in _producer_ids or _member in _seen for _member in _members):
            raise ValueError("Move reports must partition retained atomic moves.")
        _seen.update(_members)
        _records = [_by_id[_member] for _member in _members]
        if _kind == "atomic":
            if _members != [_id]:
                raise ValueError("Atomic report must retain its original move identity.")
            for _key in ("content_relationship", "from_xpaths", "to_xpaths", "from_raw_texts", "to_raw_texts"):
                if _report.get(_key) != _records[0].get(_key):
                    raise ValueError("Atomic report evidence must match its retained move.")
            _projected.append({**_report, **_records[0], "report_kind": _kind, "member_move_ids": _members})
            continue
        if (
            len(_members) < 2 or _report.get("content_relationship") != "type1"
            or any(_record.get("content_relationship") != "type1" for _record in _records)
            or any(len(_record.get(_key, [])) != 1 for _record in _records
                   for _key in ("from_node_ids", "to_node_ids"))
        ):
            raise ValueError("Ordered report requires unique Type-1 member endpoints.")
        for _key in ("from_xpaths", "to_xpaths", "from_raw_texts", "to_raw_texts"):
            if _report.get(_key) != [_record[_key][0] for _record in _records]:
                raise ValueError("Ordered report evidence must preserve its member order.")
        _projected.append({
            **_report,
            "from_node_ids": [_record["from_node_ids"][0] for _record in _records],
            "to_node_ids": [_record["to_node_ids"][0] for _record in _records],
        })
    if _seen != _producer_ids:
        raise ValueError("Move reports must partition retained atomic moves.")
    _counts = {"type1": 0, "type2c": 0, "type3": 0}
    for _report in _projected:
        _relationship = _report.get("content_relationship")
        if _relationship not in _counts:
            raise ValueError("Invalid reported content relationship.")
        _counts[_relationship] += 1
    _reported_counts = _metadata.get("reported_content_relationships")
    if (type(_metadata.get("reported_move_count")) is not int
            or not isinstance(_reported_counts, dict)
            or any(type(_value) is not int for _value in _reported_counts.values())
            or _metadata.get("reported_move_count") != len(_projected)
            or _metadata.get("reported_content_relationships") != _counts):
        raise ValueError("Reported move counts must agree with reported_moves.")
    return [*_projected, *_xml_only]
