from __future__ import annotations

from typing import Any

from srcvisual.srcmove.srcmove_results import build_filename_to_unit_index, parse_srcmove_result_moves
from srcvisual.srcmove.move_regions import (
    XmlMoveRegion,
    classify_xml_move_region_side,
    collect_xml_move_regions,
)


def augment_move_results_with_node_ids(
    *,
    moved_srcdiff_xml: str,
    move_results: dict[str, Any],
) -> dict[str, Any]:
    filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)
    parsed_moves = parse_srcmove_result_moves(
        move_results,
        filename_to_unit_index=filename_to_unit_index,
    )
    xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=False,
        filename_to_unit_index=filename_to_unit_index,
    )
    move_region_paths = build_move_region_paths_by_id(xml_regions)

    moves_value = move_results.get("moves")
    assert isinstance(moves_value, list), "srcMove results must contain moves list."
    assert len(moves_value) == len(parsed_moves), (
        "srcMove results length changed while augmenting node ids."
    )

    normalized_moves: list[dict[str, Any]] = []

    for original_move, parsed_move in zip(moves_value, parsed_moves):
        assert isinstance(original_move, dict), "srcMove result move must be a dict."
        region_paths = move_region_paths.get(parsed_move.move_id)
        assert region_paths is not None, (
            f"Moved XML is missing regions for srcMove move_id={parsed_move.move_id!r}."
        )

        normalized_moves.append(
            {
                **original_move,
                "from_node_ids": list(region_paths["from_node_ids"]),
                "to_node_ids": list(region_paths["to_node_ids"]),
            }
        )

    return {
        **move_results,
        "moves": normalized_moves,
    }


def build_move_region_paths_by_id(
    xml_regions: dict[str, XmlMoveRegion],
) -> dict[str, dict[str, tuple[str, ...]]]:
    grouped_paths: dict[str, dict[str, list[str]]] = {}

    for path, region in sorted(xml_regions.items()):
        move_paths = grouped_paths.setdefault(
            region.move_id,
            {
                "from_node_ids": [],
                "to_node_ids": [],
            },
        )

        side = classify_xml_move_region_side(region)

        if side == "from":
            move_paths["from_node_ids"].append(path)
            continue

        if side == "to":
            move_paths["to_node_ids"].append(path)
            continue

    return {
        move_id: {
            "from_node_ids": tuple(paths["from_node_ids"]),
            "to_node_ids": tuple(paths["to_node_ids"]),
        }
        for move_id, paths in grouped_paths.items()
    }
