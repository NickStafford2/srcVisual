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


def visualized_file_has_diff(visualized_file: VisualizedFile) -> bool:
    if visualized_file.tree is None:
        return False

    return tree_has_diff(visualized_file.tree)


def tree_has_diff(node: dict[str, object]) -> bool:
    kind = node.get("kind")

    if kind in DIFF_KINDS:
        return True

    children = node.get("children")

    assert isinstance(children, list), (
        f"Tree node {node.get('path')!r} has invalid children."
    )

    for child in children:
        assert isinstance(child, dict), (
            f"Tree node {node.get('path')!r} has a non-dict child."
        )

        if tree_has_diff(child):
            return True

    return False
