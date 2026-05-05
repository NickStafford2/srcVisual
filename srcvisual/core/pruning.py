from __future__ import annotations

from .models import VisualizedFile


DIFF_KINDS = {"insert", "delete", "move"}


def prune_unchanged_visualized_files(
    visualized_files: tuple[VisualizedFile, ...],
) -> tuple[VisualizedFile, ...]:
    return tuple(
        visualized_file
        for visualized_file in visualized_files
        if visualized_file_has_diff(visualized_file)
    )


def prune_visualized_files_to_edited_branches(
    visualized_files: tuple[VisualizedFile, ...],
) -> tuple[VisualizedFile, ...]:
    pruned_files: list[VisualizedFile] = []

    for visualized_file in visualized_files:
        if visualized_file.tree is None:
            continue

        pruned_tree = prune_tree_to_edited_branches(visualized_file.tree)

        if pruned_tree is None:
            continue

        pruned_files.append(
            VisualizedFile(
                revision_file=visualized_file.revision_file,
                tree=pruned_tree,
            )
        )

    return tuple(pruned_files)


def prune_tree_to_edited_branches(
    node: dict[str, object],
) -> dict[str, object] | None:
    kind = node.get("kind")

    assert isinstance(kind, str), f"Tree node {node.get('path')!r} has invalid kind."

    children = expect_tree_children(node)
    pruned_children: list[dict[str, object]] = []

    for child in children:
        pruned_child = prune_tree_to_edited_branches(child)

        if pruned_child is not None:
            pruned_children.append(pruned_child)

    if kind in DIFF_KINDS or pruned_children:
        return {
            **node,
            "children": pruned_children,
        }

    return None


def visualized_file_has_diff(visualized_file: VisualizedFile) -> bool:
    if visualized_file.tree is None:
        return False

    return tree_has_diff(visualized_file.tree)


def tree_has_diff(node: dict[str, object]) -> bool:
    kind = node.get("kind")

    if kind in DIFF_KINDS:
        return True

    for child in expect_tree_children(node):
        if tree_has_diff(child):
            return True

    return False


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
