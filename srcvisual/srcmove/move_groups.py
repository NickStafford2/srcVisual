from __future__ import annotations

from collections.abc import Mapping

from srcvisual.srcmove.move_regions import XmlMoveRegion
from srcvisual.srcmove.tree_move_nodes import TreeMoveNode


MoveNode = XmlMoveRegion | TreeMoveNode


def group_move_paths_by_move_id(
    moves: Mapping[str, MoveNode],
) -> dict[str, set[str]]:
    groups: dict[str, set[str]] = {}

    for path, move in moves.items():
        groups.setdefault(move.move_id, set()).add(path)

    return groups


def format_move_groups(groups: dict[str, set[str]]) -> dict[str, list[str]]:
    return {move_id: sorted(paths) for move_id, paths in sorted(groups.items())}
