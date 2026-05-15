from __future__ import annotations

from pathlib import Path
from typing import Any

from srcvisual.srcmove.existing_annotations import (
    build_move_results_from_moved_srcdiff,
    has_srcmove_annotations,
)
from srcvisual.workflow._positioned_srcdiff_builder import (
    has_position_annotations,
    restore_original_metadata_on_path,
    run_srcdiff_with_positions,
)
from srcvisual.core.notify import ProgressCallback, notify_progress
from srcvisual.srcmove.runner import run_srcmove


def build_moved_srcdiff_xml(
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
        notify_progress(
            progress,
            "Reconstructing move results from uploaded srcMove-annotated XML.",
        )

        move_results = build_move_results_from_moved_srcdiff(
            moved_srcdiff_xml=uploaded_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )
        notify_progress(
            progress,
            "Reconstructed move results from uploaded annotations: "
            f"moves={move_results.get('move_count', '?')}.",
        )

        return uploaded_srcdiff_xml, move_results, False

    if has_position_annotations(uploaded_srcdiff_xml):
        notify_progress(
            progress,
            "Uploaded srcdiff already has position data. Skipping srcdiff.",
        )
        notify_progress(
            progress,
            "Running srcMove on uploaded srcdiff with existing position data.",
        )

        moved_srcdiff_xml, move_results = run_srcmove(
            positioned_path=input_path,
            tmpdir=tmpdir,
            progress=progress,
        )
        notify_progress(
            progress,
            "Completed srcMove on uploaded positioned srcdiff: "
            f"moves={move_results.get('move_count', '?')}.",
        )

        return moved_srcdiff_xml, move_results, True

    notify_progress(
        progress,
        "Uploaded srcdiff is missing position data. Running srcdiff with positions first.",
    )
    positioned_path = run_srcdiff_with_positions(
        revision_0_dir=revision_0_dir,
        revision_1_dir=revision_1_dir,
        revision_0_input=revision_0_input,
        revision_1_input=revision_1_input,
        tmpdir=tmpdir,
        progress=progress,
    )
    notify_progress(
        progress,
        "Completed srcdiff with position data. Restoring original metadata.",
    )
    restore_original_metadata_on_path(
        original_srcdiff_xml=uploaded_srcdiff_xml,
        generated_path=positioned_path,
    )
    notify_progress(progress, "Restored original metadata onto positioned srcdiff.")

    moved_srcdiff_xml, move_results = run_srcmove(
        positioned_path=positioned_path,
        tmpdir=tmpdir,
        progress=progress,
    )
    notify_progress(
        progress,
        "Completed srcMove on positioned srcdiff: "
        f"moves={move_results.get('move_count', '?')}.",
    )

    return moved_srcdiff_xml, move_results, True
