from __future__ import annotations

import os
from typing import Literal

from srcvisual.annotated_srcdiff.tree_node import TreeNodeDict
from srcvisual.files.models import VisualizedFile


PruningLevel = Literal["none", "file-only", "file-and-tree", "move-only"]

ALL_DIFF_KINDS = {"insert", "delete", "move"}
MOVE_ONLY_KINDS = {"move"}

DEFAULT_PRUNING_LEVEL: PruningLevel = "file-and-tree"


def parse_tree_pruning_level(raw_level: str) -> PruningLevel:
    _level = raw_level.strip().lower().replace("_", "-")

    if _level in {"none", "off", "no-pruning", "no-prune"}:
        return "none"

    if _level in {"file", "files", "file-only"}:
        return "file-only"

    if _level in {"tree", "file-and-tree", "files-and-tree"}:
        return "file-and-tree"

    if _level in {"move", "moves", "move-only"}:
        return "move-only"

    raise ValueError(
        "Pruning level must be one of: "
        "none, file-only, file-and-tree, move-only."
    )


def get_tree_pruning_level() -> PruningLevel:
    _raw_level = os.environ.get("SRCVISUAL_PRUNING_LEVEL", DEFAULT_PRUNING_LEVEL)

    try:
        return parse_tree_pruning_level(_raw_level)
    except ValueError as exc:
        raise ValueError(
            "SRCVISUAL_PRUNING_LEVEL must be one of: "
            "none, file-only, file-and-tree, move-only."
        ) from exc


def prune_visualized_files(
    visualized_files: tuple[VisualizedFile, ...],
    *,
    level: PruningLevel | None = None,
) -> tuple[VisualizedFile, ...]:
    pruning_level = level or get_tree_pruning_level()

    if pruning_level == "none":
        return visualized_files

    if pruning_level == "file-only":
        return prune_files_by_target_kinds(
            visualized_files,
            target_kinds=ALL_DIFF_KINDS,
            prune_tree_branches=False,
        )

    if pruning_level == "file-and-tree":
        return prune_files_by_target_kinds(
            visualized_files,
            target_kinds=ALL_DIFF_KINDS,
            prune_tree_branches=True,
        )

    if pruning_level == "move-only":
        return prune_files_by_target_kinds(
            visualized_files,
            target_kinds=MOVE_ONLY_KINDS,
            prune_tree_branches=True,
        )

    raise AssertionError(f"Unhandled pruning level: {pruning_level!r}")


def prune_files_by_target_kinds(
    visualized_files: tuple[VisualizedFile, ...],
    *,
    target_kinds: set[str],
    prune_tree_branches: bool,
) -> tuple[VisualizedFile, ...]:
    pruned_files: list[VisualizedFile] = []

    for visualized_file in visualized_files:
        tree = visualized_file.tree

        if tree is None:
            continue

        if not tree_has_target_kind(tree, target_kinds=target_kinds):
            continue

        if not prune_tree_branches:
            pruned_files.append(visualized_file)
            continue

        pruned_tree = prune_tree_to_target_branches(
            tree,
            target_kinds=target_kinds,
        )

        assert pruned_tree is not None, (
            "Tree was known to contain a target kind but pruning returned None. "
            f"unit_id={visualized_file.revision_file.unit_id}, "
            f"filename={visualized_file.revision_file.filename!r}."
        )

        pruned_files.append(
            VisualizedFile(
                revision_file=visualized_file.revision_file,
                tree=pruned_tree,
            )
        )

    return tuple(pruned_files)


def prune_tree_to_target_branches(
    node: TreeNodeDict,
    *,
    target_kinds: set[str],
) -> TreeNodeDict | None:
    # Important:
    # Once the node itself is a target, keep the whole subtree.
    # Do not prune children inside insert/delete/move nodes for file-and-tree.
    # Do not prune children inside move nodes for move-only.
    if node["kind"] in target_kinds:
        return node

    pruned_children: list[TreeNodeDict] = []

    for child in node["children"]:
        pruned_child = prune_tree_to_target_branches(
            child,
            target_kinds=target_kinds,
        )

        if pruned_child is not None:
            pruned_children.append(pruned_child)

    if not pruned_children:
        return None

    pruned_node = node.copy()
    pruned_node["children"] = pruned_children
    return pruned_node


def tree_has_target_kind(
    node: TreeNodeDict,
    *,
    target_kinds: set[str],
) -> bool:
    if node["kind"] in target_kinds:
        return True

    return any(
        tree_has_target_kind(child, target_kinds=target_kinds)
        for child in node["children"]
    )
