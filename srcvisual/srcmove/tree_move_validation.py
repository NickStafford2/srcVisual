from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from srcvisual.core.validation import require
from srcvisual.srcmove.move_groups import (
    format_move_groups,
    group_move_paths_by_move_id,
)
from srcvisual.srcmove.move_regions import XmlMoveRegion, collect_xml_move_regions
from srcvisual.srcmove.srcmove_results import build_filename_to_unit_index
from srcvisual.srcmove.tree_move_nodes import TreeMoveNode, collect_tree_move_nodes


def assert_moved_srcdiff_matches_visualized_tree_moves(
    *,
    moved_srcdiff_xml: str,
    visualized_files: Iterable[Any],
    include_skipped_tags: bool,
) -> None:
    filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)

    xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=filename_to_unit_index,
    )

    tree_moves = collect_tree_move_nodes(
        tuple(visualized_files),
        filename_to_unit_index=filename_to_unit_index,
    )

    assert_move_paths_match(
        xml_regions=xml_regions,
        tree_moves=tree_moves,
    )

    assert_move_node_payloads_match(
        xml_regions=xml_regions,
        tree_moves=tree_moves,
    )

    assert_move_groups_match(
        xml_regions=xml_regions,
        tree_moves=tree_moves,
    )


def assert_move_paths_match(
    *,
    xml_regions: dict[str, XmlMoveRegion],
    tree_moves: dict[str, TreeMoveNode],
) -> None:
    xml_paths = set(xml_regions)
    tree_paths = set(tree_moves)

    require(
        xml_paths == tree_paths,
        "Move node paths differ between moved srcdiff XML and tree payload. "
        f"Only in XML: {sorted(xml_paths - tree_paths)}. "
        f"Only in tree: {sorted(tree_paths - xml_paths)}.",
    )


def assert_move_node_payloads_match(
    *,
    xml_regions: dict[str, XmlMoveRegion],
    tree_moves: dict[str, TreeMoveNode],
) -> None:
    for path in sorted(xml_regions):
        xml_region = xml_regions[path]
        tree_move = tree_moves[path]

        assert_tree_move_node_payload_matches_xml_region(
            path=path,
            xml_region=xml_region,
            tree_move=tree_move,
        )


def assert_tree_move_node_payload_matches_xml_region(
    *,
    path: str,
    xml_region: XmlMoveRegion,
    tree_move: TreeMoveNode,
) -> None:
    require(
        xml_region.path == tree_move.path,
        f"Move path mismatch at {path}: "
        f"XML path={xml_region.path!r}, tree path={tree_move.path!r}.",
    )

    require(
        tree_move.kind == "move",
        f"Tree node at {path} has move payload but kind={tree_move.kind!r}.",
    )

    require(
        xml_region.tag == tree_move.tag,
        f"Move tag mismatch at {path}: "
        f"XML tag={xml_region.tag!r}, tree tag={tree_move.tag!r}.",
    )

    require(
        xml_region.move_id == tree_move.move_id,
        f"Move id mismatch at {path}: "
        f"XML mv:id={xml_region.move_id!r}, tree move_id={tree_move.move_id!r}.",
    )

    require(
        xml_region.from_paths == tree_move.from_paths,
        f"Move mv:from mismatch at {path}: "
        f"XML={xml_region.from_paths!r}, tree={tree_move.from_paths!r}.",
    )

    require(
        xml_region.to_paths == tree_move.to_paths,
        f"Move mv:to mismatch at {path}: "
        f"XML={xml_region.to_paths!r}, tree={tree_move.to_paths!r}.",
    )

    require(
        xml_region.position_start == tree_move.position_start,
        f"Move pos:start mismatch at {path}: "
        f"XML={xml_region.position_start!r}, tree={tree_move.position_start!r}.",
    )

    require(
        xml_region.position_end == tree_move.position_end,
        f"Move pos:end mismatch at {path}: "
        f"XML={xml_region.position_end!r}, tree={tree_move.position_end!r}.",
    )

    require(
        tree_move.xml_span is not None,
        f"Move node at {path} is missing xml_span in the tree payload.",
    )


def assert_move_groups_match(
    *,
    xml_regions: dict[str, XmlMoveRegion],
    tree_moves: dict[str, TreeMoveNode],
) -> None:
    xml_groups = group_move_paths_by_move_id(xml_regions)
    tree_groups = group_move_paths_by_move_id(tree_moves)

    require(
        xml_groups == tree_groups,
        "Move id groupings differ between moved srcdiff XML and tree payload. "
        f"XML groups={format_move_groups(xml_groups)}. "
        f"Tree groups={format_move_groups(tree_groups)}.",
    )

    for move_id, paths in sorted(tree_groups.items()):
        require(
            len(paths) >= 2,
            f"Move id {move_id!r} only appears once in the tree payload: "
            f"{sorted(paths)}. Expected a move pair or move group.",
        )
