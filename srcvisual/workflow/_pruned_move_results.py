from __future__ import annotations

from typing import Any

from srcvisual.srcmove.move_regions import collect_xml_move_regions
from srcvisual.srcmove.move_result_enrichment import build_move_region_paths_by_id
from srcvisual.srcmove.srcmove_results import (
    build_filename_to_unit_index,
    parse_srcmove_result_moves,
)


def prune_move_results(
    *,
    moved_srcdiff_xml: str,
    move_results: dict[str, Any],
    include_skipped_tags: bool,
) -> dict[str, Any]:
    _filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)
    _parsed_moves = parse_srcmove_result_moves(
        move_results,
        filename_to_unit_index=_filename_to_unit_index,
    )
    _xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=_filename_to_unit_index,
    )
    _move_region_paths = build_move_region_paths_by_id(_xml_regions)
    _moves_value = move_results.get("moves")

    assert isinstance(_moves_value, list), "srcMove results must contain a moves list."
    assert len(_moves_value) == len(_parsed_moves), (
        "srcMove results changed length before pruning move payload."
    )

    _pruned_moves: list[dict[str, Any]] = []

    for _original_move, _parsed_move in zip(
        _moves_value,
        _parsed_moves,
        strict=True,
    ):
        assert isinstance(_original_move, dict), (
            "srcMove move records must remain dictionaries during pruning."
        )
        _region_paths = _move_region_paths.get(_parsed_move.move_id)

        if _region_paths is None:
            continue

        _pruned_moves.append(
            {
                **_original_move,
                "from_xpaths": list(_parsed_move.from_xpaths),
                "to_xpaths": list(_parsed_move.to_xpaths),
                "from_node_ids": list(_region_paths["from_node_ids"]),
                "to_node_ids": list(_region_paths["to_node_ids"]),
            }
        )

    return {
        **move_results,
        "move_count": len(_pruned_moves),
        "annotated_regions": len(_xml_regions),
        "groups_total": len(_pruned_moves),
        "moves": _pruned_moves,
    }
