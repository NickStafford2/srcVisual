from __future__ import annotations

import xml.etree.ElementTree as ET

from .core.filenames import normalize_visualized_filename
from .core.models import RevisionFile, VisualizedFile
from .core.units import get_srcdiff_file_unit_elements


def build_visualized_files(
    *,
    annotated_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    tree_by_unit: dict[int, dict[str, object]],
) -> tuple[VisualizedFile, ...]:
    annotated_filenames = _read_annotated_unit_filenames(annotated_srcdiff_xml)
    revision_files_by_filename = _build_revision_file_index_by_filename(revision_files)
    normalized_revision_files_by_filename = _build_normalized_revision_file_index(
        revision_files
    )
    visualized_files: list[VisualizedFile] = []

    for annotated_unit_id, annotated_filename in enumerate(
        annotated_filenames,
        start=1,
    ):
        source_owner = revision_files_by_filename.get(annotated_filename)
        visualized_filename = annotated_filename

        if source_owner is None:
            source_owner = normalized_revision_files_by_filename.get(
                normalize_visualized_filename(annotated_filename)
            )
            if source_owner is not None:
                visualized_filename = normalize_visualized_filename(
                    source_owner.filename
                )

        assert source_owner is not None, (
            "Annotated srcdiff filename is missing from extracted revision files. "
            f"filename={annotated_filename!r}, annotated unit={annotated_unit_id}."
        )

        tree = tree_by_unit.get(annotated_unit_id)

        if tree is not None and visualized_filename != annotated_filename:
            tree = _build_visualized_tree_root(
                tree=tree,
                filename=visualized_filename,
            )

        visualized_files.append(
            VisualizedFile(
                revision_file=RevisionFile(
                    unit_id=annotated_unit_id,
                    filename=visualized_filename,
                    language=source_owner.language,
                    revision_0_source_code=source_owner.revision_0_source_code,
                    revision_1_source_code=source_owner.revision_1_source_code,
                ),
                tree=tree,
            )
        )

    return tuple(visualized_files)


def _build_visualized_tree_root(
    *,
    tree: dict[str, object],
    filename: str,
) -> dict[str, object]:
    srcdiff_attributes = tree.get("srcdiff_attributes")

    if not isinstance(srcdiff_attributes, dict):
        return {**tree, "label": f"unit: {filename}"}

    unit_attributes = srcdiff_attributes.get("unit")

    if not isinstance(unit_attributes, dict):
        return {**tree, "label": f"unit: {filename}"}

    return {
        **tree,
        "label": f"unit: {filename}",
        "srcdiff_attributes": {
            **srcdiff_attributes,
            "unit": {
                **unit_attributes,
                "filename": filename,
            },
        },
    }


def _read_annotated_unit_filenames(annotated_srcdiff_xml: str) -> tuple[str, ...]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = get_srcdiff_file_unit_elements(root)

    filenames: list[str] = []

    for unit_index, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename")

        assert isinstance(filename, str) and filename, (
            "Annotated srcdiff unit is missing a filename attribute at "
            f"index {unit_index}."
        )

        filenames.append(filename)

    return tuple(filenames)


def _build_normalized_revision_file_index(
    revision_files: tuple[RevisionFile, ...],
) -> dict[str, RevisionFile]:
    indexed_files: dict[str, RevisionFile] = {}
    duplicate_filenames: set[str] = set()

    for revision_file in revision_files:
        normalized = normalize_visualized_filename(revision_file.filename)

        if normalized in duplicate_filenames:
            continue

        if normalized in indexed_files:
            del indexed_files[normalized]
            duplicate_filenames.add(normalized)
            continue

        indexed_files[normalized] = revision_file

    return indexed_files


def _build_revision_file_index_by_filename(
    revision_files: tuple[RevisionFile, ...],
) -> dict[str, RevisionFile]:
    indexed_files: dict[str, RevisionFile] = {}

    for revision_file in revision_files:
        assert revision_file.filename not in indexed_files, (
            "Extracted revision files contain duplicate filenames, so srcMove "
            "cannot be the sole source of truth for unit ownership. "
            f"duplicate filename={revision_file.filename!r}."
        )
        indexed_files[revision_file.filename] = revision_file

    return indexed_files
