from __future__ import annotations

from typing import Protocol


class MoveLike(Protocol):
    move_id: str


def group_move_paths_by_move_id(
    moves: dict[str, MoveLike],
) -> dict[str, set[str]]:
    groups: dict[str, set[str]] = {}

    for path, move in moves.items():
        groups.setdefault(move.move_id, set()).add(path)

    return groups


def format_move_groups(groups: dict[str, set[str]]) -> dict[str, list[str]]:
    return {move_id: sorted(paths) for move_id, paths in sorted(groups.items())}
