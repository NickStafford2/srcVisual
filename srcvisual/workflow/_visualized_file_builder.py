from __future__ import annotations

from collections.abc import Mapping
import xml.etree.ElementTree as ET

from srcvisual.annotated_srcdiff.tree_node import TreeNodeDict
from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.files.models import RevisionFile, VisualizedFile


def build_visualized_files(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    tree_by_unit: Mapping[int, TreeNodeDict],
) -> tuple[VisualizedFile, ...]:
    moved_filenames = _read_moved_unit_filenames(moved_srcdiff_xml)
    revision_files_by_unit_id = _build_revision_file_index_by_unit_id(revision_files)
    visualized_files: list[VisualizedFile] = []

    for moved_unit_id, moved_filename in enumerate(
        moved_filenames,
        start=1,
    ):
        source_owner = revision_files_by_unit_id.get(moved_unit_id)

        assert source_owner is not None, (
            "Moved srcdiff unit is missing extracted revision file metadata. "
            f"moved unit={moved_unit_id}, filename={moved_filename!r}."
        )

        tree = tree_by_unit.get(moved_unit_id)

        visualized_files.append(
            VisualizedFile(
                revision_file=RevisionFile(
                    unit_id=moved_unit_id,
                    filename=moved_filename,
                    revision_0_filename=source_owner.revision_0_filename,
                    revision_1_filename=source_owner.revision_1_filename,
                    language=source_owner.language,
                    revision_0_source_code=source_owner.revision_0_source_code,
                    revision_1_source_code=source_owner.revision_1_source_code,
                ),
                tree=tree,
            )
        )

    return tuple(visualized_files)


def _read_moved_unit_filenames(moved_srcdiff_xml: str) -> tuple[str, ...]:
    root = ET.fromstring(moved_srcdiff_xml)
    unit_elements = get_srcdiff_file_unit_elements(root)

    filenames: list[str] = []

    for unit_index, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename")

        assert isinstance(filename, str) and filename, (
            f"Moved srcdiff unit is missing a filename attribute at index {unit_index}."
        )

        filenames.append(filename)

    return tuple(filenames)


def _build_revision_file_index_by_unit_id(
    revision_files: tuple[RevisionFile, ...],
) -> dict[int, RevisionFile]:
    indexed_files: dict[int, RevisionFile] = {}

    for revision_file in revision_files:
        assert revision_file.unit_id not in indexed_files, (
            "Extracted revision files contain duplicate unit ids. "
            f"duplicate unit_id={revision_file.unit_id!r}."
        )
        indexed_files[revision_file.unit_id] = revision_file

    return indexed_files
