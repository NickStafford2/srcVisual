from __future__ import annotations

from pathlib import Path

from srcvisual.tempfiles import managed_tmpdir

from .core.archive import extract_revision_files
from .core.filenames import sanitize_filename
from .core.models import VisualizationPayload
from .core.pruning import get_pruning_level, prune_visualized_files
from .core.tree_builder import build_tree_index
from .core.validation import (
    validate_moved_srcdiff_and_tree,
    validate_srcmove_results_match_xml,
    validate_visualization_payload,
    validate_xml_span_index,
)
from .notify import ProgressCallback, notify_progress
from .srcmove import (
    is_strict_srcmove_validation_enabled,
)
from .srcdiff import build_moved_srcdiff_xml
from .transform._move_results import augment_move_results_with_node_ids
from .visualize_data import build_visualized_files


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

        moved_srcdiff_xml, move_results, _should_validate_srcmove_results = (
            build_moved_srcdiff_xml(
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
                "Strict srcMove validation is enabled. Validating results.json against moved XML.",
            )
            validate_srcmove_results_match_xml(
                moved_srcdiff_xml=moved_srcdiff_xml,
                move_results=move_results,
                include_skipped_tags=include_skipped_tags,
            )
        else:
            notify_progress(
                progress,
                "Skipping strict srcMove results validation.",
            )

        notify_progress(progress, "Validating moved srcdiff XML.")
        validate_xml_span_index(
            moved_srcdiff_xml=moved_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        notify_progress(progress, "Normalizing move partner node ids.")
        move_results = augment_move_results_with_node_ids(
            moved_srcdiff_xml=moved_srcdiff_xml,
            move_results=move_results,
        )

        notify_progress(progress, "Building tree view data.")
        tree_by_unit, has_position_data = build_tree_index(
            moved_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        visualized_files = build_visualized_files(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=revision_files,
            tree_by_unit=tree_by_unit,
        )

        notify_progress(progress, "Validating moved XML against full tree data.")
        validate_moved_srcdiff_and_tree(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=revision_files,
            visualized_files=visualized_files,
            include_skipped_tags=include_skipped_tags,
        )

    full_payload_result = VisualizationPayload(
        source_filename=filename,
        moved_srcdiff_xml=moved_srcdiff_xml,
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
        moved_srcdiff_xml=moved_srcdiff_xml,
        move_results=move_results,
        has_position_data=has_position_data,
        files=visualized_files,
    )
