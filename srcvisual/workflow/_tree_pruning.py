from __future__ import annotations

import os
from typing import Literal

from srcvisual.workflow.models import VisualizedFile


PruningLevel = Literal["file-only", "file-and-tree", "move-only"]

ALL_DIFF_KINDS = {"insert", "delete", "move"}
MOVE_ONLY_KINDS = {"move"}

DEFAULT_PRUNING_LEVEL: PruningLevel = "file-and-tree"


def get_tree_pruning_level() -> PruningLevel:
    raw_level = os.environ.get("SRCVISUAL_PRUNING_LEVEL", DEFAULT_PRUNING_LEVEL)
    level = raw_level.strip().lower().replace("_", "-")

    if level in {"file", "files", "file-only"}:
        return "file-only"

    if level in {"tree", "file-and-tree", "files-and-tree"}:
        return "file-and-tree"

    if level in {"move", "moves", "move-only"}:
        return "move-only"

    raise ValueError(
        "SRCVISUAL_PRUNING_LEVEL must be one of: file-only, file-and-tree, move-only."
    )


def prune_visualized_files(
    visualized_files: tuple[VisualizedFile, ...],
    *,
    level: PruningLevel | None = None,
) -> tuple[VisualizedFile, ...]:
    pruning_level = level or get_tree_pruning_level()

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

    raise AssertionError(f"Unhandled pruning level: {pruning_level}")


def prune_files_by_target_kinds(
    visualized_files: tuple[VisualizedFile, ...],
    *,
    target_kinds: set[str],
    prune_tree_branches: bool,
) -> tuple[VisualizedFile, ...]:
    pruned_files: list[VisualizedFile] = []

    for visualized_file in visualized_files:
        if visualized_file.tree is None:
            continue

        if not tree_has_target_kind(
            visualized_file.tree,
            target_kinds=target_kinds,
        ):
            continue

        if not prune_tree_branches:
            pruned_files.append(visualized_file)
            continue

        pruned_tree = prune_tree_to_target_branches(
            visualized_file.tree,
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
    node: dict[str, object],
    *,
    target_kinds: set[str],
) -> dict[str, object] | None:
    kind = expect_tree_kind(node)

    # Important:
    # Once the node itself is a target, keep the whole subtree.
    # Do not prune children inside insert/delete/move nodes for file-and-tree.
    # Do not prune children inside move nodes for move-only.
    if kind in target_kinds:
        return node

    pruned_children: list[dict[str, object]] = []

    for child in expect_tree_children(node):
        pruned_child = prune_tree_to_target_branches(
            child,
            target_kinds=target_kinds,
        )

        if pruned_child is not None:
            pruned_children.append(pruned_child)

    if pruned_children:
        return {
            **node,
            "children": pruned_children,
        }

    return None


def tree_has_target_kind(
    node: dict[str, object],
    *,
    target_kinds: set[str],
) -> bool:
    kind = expect_tree_kind(node)

    if kind in target_kinds:
        return True

    for child in expect_tree_children(node):
        if tree_has_target_kind(child, target_kinds=target_kinds):
            return True

    return False


def expect_tree_kind(node: dict[str, object]) -> str:
    kind = node.get("kind")

    assert isinstance(kind, str), f"Tree node {node.get('path')!r} has invalid kind."

    return kind


def expect_tree_children(node: dict[str, object]) -> list[dict[str, object]]:
    children = node.get("children")

    assert isinstance(children, list), (
        f"Tree node {node.get('path')!r} has invalid children."
    )

    for child in children:
        assert isinstance(child, dict), (
            f"Tree node {node.get('path')!r} has a non-dict child."
        )

    return children
