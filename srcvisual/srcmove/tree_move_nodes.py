from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from srcvisual.srcmove.validate_span_payloads import assert_optional_span_dict
from srcvisual.srcmove.srcmove_results import normalize_srcmove_xpath_tuple


class RevisionFileLike(Protocol):
    unit_id: int
    filename: str


class VisualizedFileLike(Protocol):
    revision_file: RevisionFileLike
    tree: dict[str, Any] | None


@dataclass(frozen=True)
class TreeMoveNode:
    path: str
    tag: str
    move_id: str
    kind: str
    from_paths: tuple[str, ...]
    to_paths: tuple[str, ...]
    position_start: str | None
    position_end: str | None
    xml_span: dict[str, int] | None
    revision_0_span: dict[str, int] | None
    revision_1_span: dict[str, int] | None


def collect_tree_move_nodes(
    visualized_files: tuple[VisualizedFileLike, ...],
    *,
    filename_to_unit_index: dict[str, int],
) -> dict[str, TreeMoveNode]:
    moves: dict[str, TreeMoveNode] = {}

    for visualized_file in visualized_files:
        assert visualized_file.tree is not None, (
            f"Missing tree for unit {visualized_file.revision_file.unit_id} "
            f"({visualized_file.revision_file.filename})."
        )

        collect_tree_move_nodes_from_node(
            visualized_file.tree,
            moves,
            filename_to_unit_index=filename_to_unit_index,
        )

    return moves


def collect_tree_move_nodes_from_node(
    node: dict[str, object],
    moves: dict[str, TreeMoveNode],
    *,
    filename_to_unit_index: dict[str, int],
) -> None:
    assert isinstance(node.get("path"), str), f"Tree node has invalid path: {node!r}."
    assert isinstance(node.get("tag"), str), f"Tree node has invalid tag: {node!r}."
    assert isinstance(node.get("kind"), str), f"Tree node has invalid kind: {node!r}."

    path = node["path"]
    tag = node["tag"]
    kind = node["kind"]
    move_id = node.get("move_id")

    assert isinstance(path, str)
    assert isinstance(tag, str)
    assert isinstance(kind, str)

    srcdiff_attributes = node.get("srcdiff_attributes")
    assert isinstance(srcdiff_attributes, dict), (
        f"Tree node at {path} is missing srcdiff_attributes."
    )

    position = srcdiff_attributes.get("position")
    move = srcdiff_attributes.get("move")

    if move_id is not None:
        assert isinstance(move_id, str), (
            f"Tree node at {path} has non-string move_id={move_id!r}."
        )

        assert isinstance(move, dict), (
            f"Tree node at {path} has move_id={move_id!r} "
            "but srcdiff_attributes.move is missing."
        )

        assert move.get("id") == move_id, (
            f"Tree node at {path} has move_id={move_id!r} "
            f"but srcdiff_attributes.move.id={move.get('id')!r}."
        )

        from_paths = move.get("from_paths")
        to_paths = move.get("to_paths")

        assert isinstance(from_paths, list), (
            f"Tree node at {path} has invalid move.from_paths."
        )
        assert isinstance(to_paths, list), (
            f"Tree node at {path} has invalid move.to_paths."
        )

        for from_path in from_paths:
            assert isinstance(from_path, str), (
                f"Tree node at {path} has non-string move.from_paths item."
            )

        for to_path in to_paths:
            assert isinstance(to_path, str), (
                f"Tree node at {path} has non-string move.to_paths item."
            )

        if position is not None:
            assert isinstance(position, dict), (
                f"Tree node at {path} has invalid position attributes: {position!r}."
            )
            position_start = position.get("start")
            position_end = position.get("end")
        else:
            position_start = None
            position_end = None

        assert path not in moves, (
            f"Duplicate tree move path while collecting moves: {path}."
        )

        moves[path] = TreeMoveNode(
            path=path,
            tag=tag,
            move_id=move_id,
            kind=kind,
            from_paths=normalize_srcmove_xpath_tuple(
                tuple(from_paths),
                filename_to_unit_index=filename_to_unit_index,
            ),
            to_paths=normalize_srcmove_xpath_tuple(
                tuple(to_paths),
                filename_to_unit_index=filename_to_unit_index,
            ),
            position_start=position_start if isinstance(position_start, str) else None,
            position_end=position_end if isinstance(position_end, str) else None,
            xml_span=assert_optional_span_dict(node.get("xml_span"), path, "xml_span"),
            revision_0_span=assert_optional_span_dict(
                node.get("revision_0_span"),
                path,
                "revision_0_span",
            ),
            revision_1_span=assert_optional_span_dict(
                node.get("revision_1_span"),
                path,
                "revision_1_span",
            ),
        )

    children = node.get("children")
    assert isinstance(children, list), f"Tree node at {path} has invalid children."

    for child in children:
        assert isinstance(child, dict), f"Tree node at {path} has non-dict child."
        collect_tree_move_nodes_from_node(
            child,
            moves,
            filename_to_unit_index=filename_to_unit_index,
        )
