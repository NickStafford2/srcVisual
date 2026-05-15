from __future__ import annotations

from pathlib import Path
from typing import Any

from srcvisual.srcmove._moved_srcdiff import (
    build_move_results_from_moved_srcdiff,
    has_srcmove_annotations,
)
from srcvisual.workflow._positioned_srcdiff import (
    has_position_annotations,
    restore_original_metadata_on_path,
    run_srcdiff_with_positions,
)
from srcvisual.core.notify import ProgressCallback, notify_progress
from srcvisual.srcmove._srcmove import run_srcmove


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

        move_results = build_move_results_from_moved_srcdiff(
            moved_srcdiff_xml=uploaded_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        return uploaded_srcdiff_xml, move_results, False

    if has_position_annotations(uploaded_srcdiff_xml):
        notify_progress(
            progress,
            "Uploaded srcdiff already has position data. Skipping srcdiff.",
        )

        moved_srcdiff_xml, move_results = run_srcmove(
            positioned_path=input_path,
            tmpdir=tmpdir,
            progress=progress,
        )

        return moved_srcdiff_xml, move_results, True

    positioned_path = run_srcdiff_with_positions(
        revision_0_dir=revision_0_dir,
        revision_1_dir=revision_1_dir,
        revision_0_input=revision_0_input,
        revision_1_input=revision_1_input,
        tmpdir=tmpdir,
        progress=progress,
    )
    restore_original_metadata_on_path(
        original_srcdiff_xml=uploaded_srcdiff_xml,
        generated_path=positioned_path,
    )

    moved_srcdiff_xml, move_results = run_srcmove(
        positioned_path=positioned_path,
        tmpdir=tmpdir,
        progress=progress,
    )

    return moved_srcdiff_xml, move_results, True
