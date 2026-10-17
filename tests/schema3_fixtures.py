"""Synthetic current producer contracts for consumer tests; never detector evidence."""
from collections import Counter
import re


def native_xpath(path):
    return re.sub(r"(/)([A-Za-z_][\w.-]*)(?![\w.:-])", r"\1src:\2", path)


def schema3_results(moves=(), *, sequence=False, diagnostics=None):
    groups = []
    for number, move in enumerate(moves):
        endpoints = {}
        for side, prefix, parity in (("original", "from", 0), ("modified", "to", 1)):
            endpoints[side] = [
                {"candidate_id": number * 100 + offset * 2 + parity,
                 "revision_file": f"{side}.cpp" if sequence else None, "xpath": native_xpath(path),
                 "construct": None, "raw_text": text}
                for offset, (path, text) in enumerate(zip(move[f"{prefix}_xpaths"], move[f"{prefix}_raw_texts"], strict=True))
            ]
        paired = len(endpoints["original"]) == len(endpoints["modified"]) == 1
        groups.append({
            "id": move["move_id"], "content_relationship": move.get("content_relationship", "type1"),
            "correspondence": {"status": "selected_pair" if paired else "unresolved_partners"},
            "name_evidence": "not_assessed", **endpoints,
            "location_evidence": ({"scope": "pair", "classification": "relocated", "reason": "different_file"}
                                  if paired else {"scope": "group", "status": "group_relocation_evidence"}),
            "selection": {"matching_weight_milli": 1000, "utility": 1000, "matched_units": 1,
                          "reason": "greedy_utility"},
        })
    items = [{"id": "item:" + group["id"], "kind": "atomic_move_group", "member_group_ids": [group["id"]]} for group in groups]
    if sequence:
        items = [{"id": "sequence:" + groups[0]["id"], "kind": "sequence_move_group", "member_group_ids": [group["id"] for group in groups],
                  "sequence": {"policy": "ordered_adjacent_v1", **{
                      side: {"revision_file": f"{side}.cpp", "parent_id": f"{side}-parent", "first_child_ordinal": 1, "last_child_ordinal": len(groups)}
                      for side in ("original", "modified")}}}]
    def histogram(values):
        counts = Counter(values)
        return {key: counts[key] for key in ("type1", "type2c", "type3")}
    result = {
        "results_schema_version": 3,
        "summary": {"output_item_count": len(items), "atomic_move_group_count": len(groups), "sequence_move_group_count": int(sequence),
                    "pair_capacity": sum(min(len(group["original"]), len(group["modified"])) for group in groups),
                    "endpoint_count": sum(len(group[side]) for group in groups for side in ("original", "modified")),
                    "atomic_content_relationships": histogram(group["content_relationship"] for group in groups),
                    "output_content_relationships": histogram(["type1"] if sequence else [group["content_relationship"] for group in groups])},
        "output_items": items, "atomic_move_groups": groups,
        "configuration": {"min_granularity": "statement", "sequence_policy": "ordered_adjacent_v1"},
        "pipeline_statistics": {"srcdiff_region_count": 0, "grouped_candidate_entry_count": 0, "processing_group_count": 0,
                                "processing_group_kinds": dict.fromkeys(("move_1_to_1", "moves_many", "delete_only", "insert_only", "copy_or_repeat", "ambiguous"), 0)},
        "xpath_context": {"document": "input_srcdiff", "convention": "srcreader_file_units_v1", "namespaces": {
            "src": "http://www.srcML.org/srcML/src", "diff": "http://www.srcML.org/srcDiff"}},
    }
    if diagnostics is not None:
        result["diagnostics"] = diagnostics
    return result
