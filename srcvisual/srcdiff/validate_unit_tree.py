from __future__ import annotations

from collections.abc import Sequence
import xml.etree.ElementTree as ET

from srcvisual.core.validation import require
from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.workflow.models import RevisionFile, VisualizedFile


def parse_srcdiff_file_unit_elements(srcdiff_xml: str) -> list[ET.Element]:
    require(srcdiff_xml.strip() != "", "Moved srcdiff XML is empty.")

    root = ET.fromstring(srcdiff_xml)
    return list(get_srcdiff_file_unit_elements(root))


def assert_srcdiff_unit_count_matches_revisions(
    *,
    unit_elements: Sequence[ET.Element],
    revision_files: Sequence[RevisionFile],
) -> None:
    require(
        len(unit_elements) == len(revision_files),
        "Moved srcdiff unit count does not match extracted revision file count. "
        f"srcdiff units={len(unit_elements)}, revision_files={len(revision_files)}.",
    )


def assert_visualized_file_count_matches_revisions(
    *,
    visualized_files: Sequence[VisualizedFile],
    revision_files: Sequence[RevisionFile],
) -> None:
    require(
        len(visualized_files) == len(revision_files),
        "Visualized file count does not match extracted revision file count. "
        f"visualized_files={len(visualized_files)}, revision_files={len(revision_files)}.",
    )


def assert_visualized_files_match_srcdiff_units(
    *,
    unit_elements: Sequence[ET.Element],
    visualized_files: Sequence[VisualizedFile],
) -> None:
    for unit_index, (unit_element, visualized_file) in enumerate(
        zip(unit_elements, visualized_files, strict=True),
        start=1,
    ):
        expected_filename = unit_element.attrib.get("filename")
        revision_file = visualized_file.revision_file

        require(
            revision_file.unit_id == unit_index,
            "Visualized file unit_id does not match moved srcdiff unit order. "
            f"expected unit_id={unit_index}, got {revision_file.unit_id}.",
        )

        if expected_filename is not None:
            require(
                revision_file.filename == expected_filename,
                "Visualized file filename does not match moved srcdiff unit. "
                f"unit {unit_index} expected filename={expected_filename!r}, "
                f"got {revision_file.filename!r}.",
            )

        assert_visualized_tree_root_matches_srcdiff_unit(
            unit_index=unit_index,
            expected_filename=expected_filename,
            visualized_file=visualized_file,
        )


def assert_visualized_tree_root_matches_srcdiff_unit(
    *,
    unit_index: int,
    expected_filename: str | None,
    visualized_file: VisualizedFile,
) -> None:
    tree = visualized_file.tree

    if tree is None:
        return

    require(
        tree.get("path") == f"/src:unit[{unit_index}]",
        "Visualized tree root path does not match moved srcdiff unit "
        f"order for filename {visualized_file.revision_file.filename!r}. "
        f"tree path={tree.get('path')!r}.",
    )

    if expected_filename is not None:
        require(
            tree.get("label") == f"unit: {expected_filename}",
            "Visualized tree root label does not match moved srcdiff "
            f"unit filename {expected_filename!r}. "
            f"tree label={tree.get('label')!r}.",
        )


def assert_srcdiff_units_match_visualized_files(
    *,
    moved_srcdiff_xml: str,
    revision_files: Sequence[RevisionFile],
    visualized_files: Sequence[VisualizedFile],
) -> None:
    unit_elements = parse_srcdiff_file_unit_elements(moved_srcdiff_xml)

    assert_srcdiff_unit_count_matches_revisions(
        unit_elements=unit_elements,
        revision_files=revision_files,
    )

    assert_visualized_file_count_matches_revisions(
        visualized_files=visualized_files,
        revision_files=revision_files,
    )

    assert_visualized_files_match_srcdiff_units(
        unit_elements=unit_elements,
        visualized_files=visualized_files,
    )
