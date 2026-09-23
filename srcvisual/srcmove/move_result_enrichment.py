from __future__ import annotations

from typing import Any

from srcvisual.srcmove.srcmove_results import (
    build_filename_to_unit_index,
    parse_srcmove_result_moves,
)
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


def merge_producer_move_results(
    *,
    reconstructed_results: dict[str, Any],
    producer_results: dict[str, Any],
) -> dict[str, Any]:
    _reconstructed_moves = reconstructed_results.get("moves")
    _producer_moves = producer_results.get("moves")
    assert isinstance(_reconstructed_moves, list), (
        "Reconstructed move results must contain a moves list."
    )
    assert isinstance(_producer_moves, list), (
        "Producer move results must contain a moves list."
    )

    _producer_by_id = {}
    for _move in _producer_moves:
        assert isinstance(_move, dict) and isinstance(_move.get("move_id"), str), (
            "Producer move results contain an invalid move."
        )
        assert _move["move_id"] not in _producer_by_id, (
            f"Duplicate producer move id: {_move['move_id']!r}."
        )
        _producer_by_id[_move["move_id"]] = _move

    _merged_moves = []
    for _move in _reconstructed_moves:
        assert isinstance(_move, dict) and isinstance(_move.get("move_id"), str), (
            "Reconstructed move results contain an invalid move."
        )
        _producer_move = _producer_by_id.pop(_move["move_id"], None)
        _merged_moves.append(
            {
                **_move,
                **(_producer_move or {}),
                "result_provenance": (
                    "producer-results" if _producer_move else "xml-annotation"
                ),
            }
        )

    assert not _producer_by_id, (
        "Producer move results refer to moves missing from reconstructed XML: "
        f"{sorted(_producer_by_id)}."
    )
    _producer_metadata = {
        _key: _value for _key, _value in producer_results.items() if _key != "moves"
    }
    return {
        **reconstructed_results,
        "moves": _merged_moves,
        "producer_metadata": _producer_metadata,
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
