from __future__ import annotations

import xml.etree.ElementTree as ET

from srcvisual.srcdiff.move_regions import (
    TreeMoveNode,
    XmlMoveRegion,
    collect_tree_move_nodes,
    collect_xml_move_regions,
    format_move_groups,
)
from srcvisual.srcmove.srcmove_results import build_filename_to_unit_index
from srcvisual.srcdiff.units import get_srcdiff_file_unit_elements
from srcvisual.workflow.models import RevisionFile, VisualizedFile


def validate_moved_srcdiff_and_tree(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    visualized_files: tuple[VisualizedFile, ...],
    include_skipped_tags: bool,
) -> None:
    assert moved_srcdiff_xml.strip(), "Moved srcdiff XML is empty."

    _root = ET.fromstring(moved_srcdiff_xml)
    _unit_elements = get_srcdiff_file_unit_elements(_root)

    assert len(_unit_elements) == len(revision_files), (
        "Moved srcdiff unit count does not match extracted revision file count. "
        f"srcdiff units={len(_unit_elements)}, revision_files={len(revision_files)}."
    )

    assert len(visualized_files) == len(revision_files), (
        "Visualized file count does not match extracted revision file count. "
        f"visualized_files={len(visualized_files)}, revision_files={len(revision_files)}."
    )

    for _unit_index, (_unit_element, _visualized_file) in enumerate(
        zip(_unit_elements, visualized_files, strict=True),
        start=1,
    ):
        _expected_filename = _unit_element.attrib.get("filename")

        assert _visualized_file.revision_file.unit_id == _unit_index, (
            "Visualized file unit_id does not match moved srcdiff unit order. "
            f"expected unit_id={_unit_index}, "
            f"got {_visualized_file.revision_file.unit_id}."
        )

        if _expected_filename is not None:
            assert _visualized_file.revision_file.filename == _expected_filename, (
                "Visualized file filename does not match moved srcdiff unit. "
                f"unit {_unit_index} expected filename={_expected_filename!r}, "
                f"got {_visualized_file.revision_file.filename!r}."
            )

        _tree = _visualized_file.tree

        if _tree is not None:
            assert _tree.get("path") == f"/src:unit[{_unit_index}]", (
                "Visualized tree root path does not match moved srcdiff unit "
                f"order for filename {_visualized_file.revision_file.filename!r}. "
                f"tree path={_tree.get('path')!r}."
            )

            if _expected_filename is not None:
                assert _tree.get("label") == f"unit: {_expected_filename}", (
                    "Visualized tree root label does not match moved srcdiff "
                    f"unit filename {_expected_filename!r}. "
                    f"tree label={_tree.get('label')!r}."
                )

    _filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)
    _xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=_filename_to_unit_index,
    )
    _tree_moves = collect_tree_move_nodes(
        visualized_files,
        filename_to_unit_index=_filename_to_unit_index,
    )

    assert set(_xml_regions) == set(_tree_moves), (
        "Move node paths differ between moved srcdiff XML and tree payload. "
        f"Only in XML: {sorted(set(_xml_regions) - set(_tree_moves))}. "
        f"Only in tree: {sorted(set(_tree_moves) - set(_xml_regions))}."
    )

    for _path in sorted(_xml_regions):
        _xml_region = _xml_regions[_path]
        _tree_move = _tree_moves[_path]

        assert _tree_move.kind == "move", (
            f"Tree node at {_path} has mv:id={_tree_move.move_id!r} "
            f"but kind={_tree_move.kind!r}; expected kind='move'."
        )

        assert _xml_region.tag == _tree_move.tag, (
            f"Move tag mismatch at {_path}: "
            f"XML tag={_xml_region.tag!r}, tree tag={_tree_move.tag!r}."
        )

        assert _xml_region.move_id == _tree_move.move_id, (
            f"Move id mismatch at {_path}: "
            f"XML mv:id={_xml_region.move_id!r}, tree move_id={_tree_move.move_id!r}."
        )

        assert _xml_region.from_paths == _tree_move.from_paths, (
            f"Move mv:from mismatch at {_path}: "
            f"XML={_xml_region.from_paths!r}, tree={_tree_move.from_paths!r}."
        )

        assert _xml_region.to_paths == _tree_move.to_paths, (
            f"Move mv:to mismatch at {_path}: "
            f"XML={_xml_region.to_paths!r}, tree={_tree_move.to_paths!r}."
        )

        assert _xml_region.position_start == _tree_move.position_start, (
            f"Move pos:start mismatch at {_path}: "
            f"XML={_xml_region.position_start!r}, tree={_tree_move.position_start!r}."
        )

        assert _xml_region.position_end == _tree_move.position_end, (
            f"Move pos:end mismatch at {_path}: "
            f"XML={_xml_region.position_end!r}, tree={_tree_move.position_end!r}."
        )

        assert _tree_move.xml_span is not None, (
            f"Move node at {_path} is missing xml_span in the tree payload."
        )

    assert_move_groups_match(_xml_regions, _tree_moves)


def assert_move_groups_match(
    xml_regions: dict[str, XmlMoveRegion],
    tree_moves: dict[str, TreeMoveNode],
) -> None:
    _xml_groups: dict[str, set[str]] = {}
    _tree_groups: dict[str, set[str]] = {}

    for _path, _region in xml_regions.items():
        _xml_groups.setdefault(_region.move_id, set()).add(_path)

    for _path, _move in tree_moves.items():
        _tree_groups.setdefault(_move.move_id, set()).add(_path)

    assert _xml_groups == _tree_groups, (
        "Move id groupings differ between moved srcdiff XML and tree payload. "
        f"XML groups={format_move_groups(_xml_groups)}. "
        f"Tree groups={format_move_groups(_tree_groups)}."
    )

    for _move_id, _paths in sorted(_tree_groups.items()):
        assert len(_paths) >= 2, (
            f"Move id {_move_id!r} only appears once in the tree payload: "
            f"{sorted(_paths)}. Expected a move pair or move group."
        )
