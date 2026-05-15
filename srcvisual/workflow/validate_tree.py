from __future__ import annotations

from srcvisual.srcdiff.validate_unit_tree import (
    assert_srcdiff_units_match_visualized_files,
)
from srcvisual.srcdiff.xml_spans import build_xml_span_index
from srcvisual.srcmove.validate_tree_move import (
    assert_moved_srcdiff_matches_visualized_tree_moves,
)
from srcvisual.files.models import RevisionFile, VisualizedFile


def validate_moved_srcdiff_and_tree(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    visualized_files: tuple[VisualizedFile, ...],
    include_skipped_tags: bool,
) -> None:
    assert_srcdiff_units_match_visualized_files(
        moved_srcdiff_xml=moved_srcdiff_xml,
        revision_files=revision_files,
        visualized_files=visualized_files,
    )

    assert_moved_srcdiff_matches_visualized_tree_moves(
        moved_srcdiff_xml=moved_srcdiff_xml,
        visualized_files=visualized_files,
        include_skipped_tags=include_skipped_tags,
    )

    assert_xml_tree_paths_match(
        moved_srcdiff_xml=moved_srcdiff_xml,
        visualized_files=visualized_files,
        include_skipped_tags=include_skipped_tags,
    )


def assert_xml_tree_paths_match(
    *,
    moved_srcdiff_xml: str,
    visualized_files: tuple[VisualizedFile, ...],
    include_skipped_tags: bool,
) -> None:
    _xml_paths = set(
        build_xml_span_index(
            moved_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )
    )
    _tree_paths: set[str] = set()

    for _visualized_file in visualized_files:
        _tree = _visualized_file.tree

        if _tree is None:
            continue

        _collect_tree_paths(_tree, _tree_paths)

    assert _xml_paths == _tree_paths, (
        "XML paths differ between moved srcdiff XML and tree payload. "
        f"Only in XML: {sorted(_xml_paths - _tree_paths)}. "
        f"Only in tree: {sorted(_tree_paths - _xml_paths)}."
    )


def _collect_tree_paths(node: dict[str, object], tree_paths: set[str]) -> None:
    _path = node.get("path")
    assert isinstance(_path, str)
    tree_paths.add(_path)

    _children = node.get("children")
    assert isinstance(_children, list)

    for _child in _children:
        assert isinstance(_child, dict)
        _collect_tree_paths(_child, tree_paths)
