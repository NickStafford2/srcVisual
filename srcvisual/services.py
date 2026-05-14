from __future__ import annotations

from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

from srcvisual.tempfiles import managed_tmpdir

from .notify import notify_progress, ProgressCallback
from .srcmove import (
    run_srcmove,
    has_srcmove_annotations,
    is_strict_srcmove_validation_enabled,
    build_move_results_from_annotated_xml,
)
from .visualize_data import build_visualized_files
from .core.archive import extract_revision_files
from .core.commands import run_command
from .core.filenames import sanitize_filename
from .core.models import VisualizationPayload
from .core.namespaces import POS_END, POS_START
from .core.pruning import get_pruning_level, prune_visualized_files
from .core.srcdiff_restore import restore_original_srcdiff_metadata
from .core.tree_builder import build_tree_index
from .core.validation import (
    augment_move_results_with_node_ids,
    validate_annotated_srcdiff_and_tree,
    validate_srcmove_results_match_xml,
    validate_visualization_payload,
    validate_xml_span_index,
)


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


def has_position_annotations(srcdiff_xml: str) -> bool:
    root = ET.fromstring(srcdiff_xml)

    return any(
        POS_START in element.attrib and POS_END in element.attrib
        for element in root.iter()
    )


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
