from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable
import xml.etree.ElementTree as ET

from srcvisual.tempfiles import managed_tmpdir

from .notify import notify_progress, ProgressCallback
from .core.archive import extract_revision_files
from .core.commands import run_command
from .core.filenames import normalize_visualized_filename, sanitize_filename
from .core.models import RevisionFile, VisualizationPayload, VisualizedFile
from .core.namespaces import POS_END, POS_START
from .core.pruning import get_pruning_level, prune_visualized_files
from .core.srcdiff_attributes import MV_ID
from .core.srcdiff_restore import restore_original_srcdiff_metadata
from .core.tree_builder import build_tree_index
from .core.units import get_srcdiff_file_unit_elements
from .core.validation import (
    augment_move_results_with_node_ids,
    build_filename_to_unit_index,
    collect_xml_move_regions,
    validate_annotated_srcdiff_and_tree,
    validate_srcmove_results_match_xml,
    validate_visualization_payload,
    validate_xml_span_index,
)

DEFAULT_TMP_ROOT = Path(__file__).resolve().parents[1] / "temp"


def build_visualization_payload(
    *,
    filename: str,
    payload: bytes,
    include_skipped_tags: bool = False,
    progress: ProgressCallback | None = None,
) -> VisualizationPayload:
    with managed_tmpdir(progress=progress) as tmpdir:
        input_path = tmpdir / sanitize_filename(filename)
        _ = input_path.write_bytes(payload)
        notify_progress(progress, "Saved uploaded srcdiff.")

        revision_0_dir = tmpdir / "revision_0"
        revision_1_dir = tmpdir / "revision_1"
        revision_0_dir.mkdir()
        revision_1_dir.mkdir()

        notify_progress(progress, "Extracting revision sources from srcdiff.")
        extracted_layout = extract_revision_files(
            input_path=input_path,
            revision_0_dir=revision_0_dir,
            revision_1_dir=revision_1_dir,
        )
        revision_files = extracted_layout.files

        if not revision_files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        annotated_srcdiff_xml, move_results, _should_validate_srcmove_results = (
            build_annotated_srcdiff_xml(
                input_path=input_path,
                revision_0_dir=revision_0_dir,
                revision_1_dir=revision_1_dir,
                revision_0_input=extracted_layout.revision_0_input,
                revision_1_input=extracted_layout.revision_1_input,
                tmpdir=tmpdir,
                include_skipped_tags=include_skipped_tags,
                progress=progress,
            )
        )

        if is_strict_srcmove_validation_enabled():
            notify_progress(
                progress,
                "Strict srcMove validation is enabled. Validating results.json against annotated XML.",
            )
            validate_srcmove_results_match_xml(
                annotated_srcdiff_xml=annotated_srcdiff_xml,
                move_results=move_results,
                include_skipped_tags=include_skipped_tags,
            )
        else:
            notify_progress(
                progress,
                "Skipping strict srcMove results validation.",
            )

        notify_progress(progress, "Validating annotated srcdiff XML.")
        validate_xml_span_index(
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        notify_progress(progress, "Normalizing move partner node ids.")
        move_results = augment_move_results_with_node_ids(
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            move_results=move_results,
        )

        notify_progress(progress, "Building tree view data.")
        tree_by_unit, has_position_data = build_tree_index(
            annotated_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        visualized_files = build_visualized_files(
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            revision_files=revision_files,
            tree_by_unit=tree_by_unit,
        )

        notify_progress(progress, "Validating annotated XML against full tree data.")
        validate_annotated_srcdiff_and_tree(
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            revision_files=revision_files,
            visualized_files=visualized_files,
            include_skipped_tags=include_skipped_tags,
        )

    full_payload_result = VisualizationPayload(
        source_filename=filename,
        annotated_srcdiff_xml=annotated_srcdiff_xml,
        move_results=move_results,
        has_position_data=has_position_data,
        files=visualized_files,
    )

    notify_progress(progress, "Validating full visualization payload.")
    validate_visualization_payload(full_payload_result)

    original_file_count = len(visualized_files)
    pruning_level = get_pruning_level()

    notify_progress(
        progress,
        f"Pruning visualization payload with level: {pruning_level}.",
    )
    visualized_files = prune_visualized_files(
        visualized_files,
        level=pruning_level,
    )

    pruned_file_count = original_file_count - len(visualized_files)
    notify_progress(
        progress,
        f"Pruned {pruned_file_count} file(s) using level: {pruning_level}.",
    )

    return VisualizationPayload(
        source_filename=filename,
        annotated_srcdiff_xml=annotated_srcdiff_xml,
        move_results=move_results,
        has_position_data=has_position_data,
        files=visualized_files,
    )


def is_strict_srcmove_validation_enabled() -> bool:
    return os.environ.get("SRCVISUAL_STRICT_SRCMOVE_VALIDATION", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def build_annotated_srcdiff_xml(
    *,
    input_path: Path,
    revision_0_dir: Path,
    revision_1_dir: Path,
    revision_0_input: Path,
    revision_1_input: Path,
    tmpdir: Path,
    include_skipped_tags: bool,
    progress: ProgressCallback | None = None,
) -> tuple[str, dict[str, Any], bool]:
    uploaded_srcdiff_xml = input_path.read_text(encoding="utf-8")

    if has_srcmove_annotations(uploaded_srcdiff_xml):
        notify_progress(
            progress,
            "Uploaded srcdiff already has srcMove annotations. Skipping srcdiff and srcMove.",
        )

        move_results = build_move_results_from_annotated_xml(
            annotated_srcdiff_xml=uploaded_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        return uploaded_srcdiff_xml, move_results, False

    if has_position_annotations(uploaded_srcdiff_xml):
        notify_progress(
            progress,
            "Uploaded srcdiff already has position data. Skipping srcdiff.",
        )

        annotated_srcdiff_xml, move_results = run_srcmove(
            positioned_path=input_path,
            tmpdir=tmpdir,
            progress=progress,
        )

        return annotated_srcdiff_xml, move_results, True

    positioned_path = run_srcdiff_with_positions(
        revision_0_dir=revision_0_dir,
        revision_1_dir=revision_1_dir,
        revision_0_input=revision_0_input,
        revision_1_input=revision_1_input,
        tmpdir=tmpdir,
        progress=progress,
    )

    annotated_srcdiff_xml, move_results = run_srcmove(
        positioned_path=positioned_path,
        tmpdir=tmpdir,
        original_srcdiff_xml=uploaded_srcdiff_xml,
        progress=progress,
    )
    restore_original_metadata_on_path(
        original_srcdiff_xml=uploaded_srcdiff_xml,
        generated_path=positioned_path,
    )

    return annotated_srcdiff_xml, move_results, True


def run_srcdiff_with_positions(
    *,
    revision_0_dir: Path,
    revision_1_dir: Path,
    revision_0_input: Path,
    revision_1_input: Path,
    tmpdir: Path,
    progress: ProgressCallback | None = None,
) -> Path:
    positioned_path = tmpdir / "positioned.srcdiff.xml"

    notify_progress(progress, "Running srcdiff with position data.")
    result = run_command(
        [
            "srcdiff",
            "--position",
            str(revision_0_input),
            str(revision_1_input),
            "-o",
            str(positioned_path),
        ]
    )

    if not positioned_path.is_file():
        print("srcdiff stdout:")
        print(result.stdout)
        print("srcdiff stderr:")
        print(result.stderr)
        print("tmpdir contents:")
        for candidate in sorted(tmpdir.rglob("*")):
            print(candidate)

    assert positioned_path.is_file(), (
        f"srcdiff did not create expected positioned output: {positioned_path}"
    )

    if not positioned_path.read_text(encoding="utf-8").strip():
        print("srcdiff stdout:")
        print(result.stdout)
        print("srcdiff stderr:")
        print(result.stderr)
        print("tmpdir contents:")
        for candidate in sorted(tmpdir.rglob("*")):
            print(candidate)

    assert positioned_path.read_text(encoding="utf-8").strip(), (
        f"srcdiff created an empty positioned output: {positioned_path}"
    )

    return positioned_path


def run_srcmove(
    *,
    positioned_path: Path,
    tmpdir: Path,
    original_srcdiff_xml: str | None = None,
    progress: ProgressCallback | None = None,
) -> tuple[str, dict[str, Any]]:
    annotated_path = tmpdir / "annotated.srcdiff.xml"
    results_path = tmpdir / "results.json"

    notify_progress(progress, "Running srcMove annotations.")
    _ = run_command(
        [
            "srcMove",
            str(positioned_path),
            str(annotated_path),
            "--results",
            str(results_path),
        ]
    )

    assert annotated_path.is_file(), (
        f"srcMove did not create expected annotated output: {annotated_path}"
    )

    assert results_path.is_file(), (
        f"srcMove did not create expected results JSON: {results_path}"
    )

    annotated_srcdiff_xml = annotated_path.read_text(encoding="utf-8")
    results_text = results_path.read_text(encoding="utf-8")

    assert annotated_srcdiff_xml.strip(), (
        f"srcMove created an empty annotated output: {annotated_path}"
    )

    assert results_text.strip(), (
        f"srcMove created an empty results file: {results_path}"
    )

    move_results = json.loads(results_text)

    assert isinstance(move_results, dict), (
        f"srcMove results JSON must be an object; got {type(move_results).__name__}."
    )

    if original_srcdiff_xml is not None:
        annotated_srcdiff_xml = restore_original_srcdiff_metadata(
            original_xml=original_srcdiff_xml,
            generated_xml=annotated_srcdiff_xml,
        )
        annotated_path.write_text(annotated_srcdiff_xml, encoding="utf-8")

    notify_progress(progress, "Reading annotated srcdiff output.")

    return annotated_srcdiff_xml, move_results


def has_position_annotations(srcdiff_xml: str) -> bool:
    root = ET.fromstring(srcdiff_xml)

    return any(
        POS_START in element.attrib and POS_END in element.attrib
        for element in root.iter()
    )


def has_srcmove_annotations(srcdiff_xml: str) -> bool:
    root = ET.fromstring(srcdiff_xml)

    return any(MV_ID in element.attrib for element in root.iter())


def build_move_results_from_annotated_xml(
    *,
    annotated_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> dict[str, Any]:
    filename_to_unit_index = build_filename_to_unit_index(annotated_srcdiff_xml)

    xml_regions = collect_xml_move_regions(
        annotated_srcdiff_xml=annotated_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=filename_to_unit_index,
    )

    grouped_regions: dict[str, list[Any]] = {}

    for region in xml_regions.values():
        grouped_regions.setdefault(region.move_id, []).append(region)

    moves: list[dict[str, Any]] = []

    for move_id in sorted(grouped_regions):
        regions = sorted(grouped_regions[move_id], key=lambda region: region.path)

        from_regions = [region for region in regions if region.tag == "diff:delete"]
        to_regions = [region for region in regions if region.tag == "diff:insert"]

        assert from_regions, (
            f"Existing srcMove annotation {move_id!r} has no diff:delete region."
        )
        assert to_regions, (
            f"Existing srcMove annotation {move_id!r} has no diff:insert region."
        )

        moves.append(
            {
                "move_id": move_id,
                "from_xpaths": [region.path for region in from_regions],
                "to_xpaths": [region.path for region in to_regions],
                "from_raw_texts": [region.raw_text for region in from_regions],
                "to_raw_texts": [region.raw_text for region in to_regions],
            }
        )

    return {
        "move_count": len(moves),
        "annotated_regions": len(xml_regions),
        "moves": moves,
    }


def restore_original_metadata_on_path(
    *,
    original_srcdiff_xml: str,
    generated_path: Path,
) -> None:
    restored_xml = restore_original_srcdiff_metadata(
        original_xml=original_srcdiff_xml,
        generated_xml=generated_path.read_text(encoding="utf-8"),
    )
    generated_path.write_text(restored_xml, encoding="utf-8")


def build_visualized_files(
    *,
    annotated_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    tree_by_unit: dict[int, dict[str, object]],
) -> tuple[VisualizedFile, ...]:
    annotated_filenames = read_annotated_unit_filenames(annotated_srcdiff_xml)
    revision_files_by_filename = build_revision_file_index_by_filename(revision_files)
    normalized_revision_files_by_filename = build_normalized_revision_file_index(
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
            tree = build_visualized_tree_root(
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


def build_revision_file_index_by_filename(
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


def build_normalized_revision_file_index(
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


def build_visualized_tree_root(
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


def read_annotated_unit_filenames(annotated_srcdiff_xml: str) -> tuple[str, ...]:
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
