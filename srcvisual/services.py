from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Callable

from .core.archive import extract_revision_files
from .core.commands import run_command
from .core.filenames import sanitize_filename
from .core.models import VisualizationPayload, VisualizedFile
from .core.tree_builder import build_tree_index

ProgressCallback = Callable[[str], None]


def build_visualization_payload(
    *,
    filename: str,
    payload: bytes,
    include_skipped_tags: bool = False,
    progress: ProgressCallback | None = None,
) -> VisualizationPayload:
    with tempfile.TemporaryDirectory(prefix="srcvisual-") as tmpdir_name:
        tmpdir = Path(tmpdir_name)
        input_path = tmpdir / sanitize_filename(filename)
        input_path.write_bytes(payload)
        notify_progress(progress, "Saved uploaded srcdiff.")

        revision_0_dir = tmpdir / "revision_0"
        revision_1_dir = tmpdir / "revision_1"
        revision_0_dir.mkdir()
        revision_1_dir.mkdir()
        notify_progress(progress, "Extracting revision sources from srcdiff.")

        revision_files = extract_revision_files(
            input_path=input_path,
            revision_0_dir=revision_0_dir,
            revision_1_dir=revision_1_dir,
        )

        if not revision_files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        annotated_srcdiff_xml = build_annotated_srcdiff_xml(
            revision_0_dir=revision_0_dir,
            revision_1_dir=revision_1_dir,
            tmpdir=tmpdir,
            progress=progress,
        )

        notify_progress(progress, "Building tree view data.")
        tree_by_unit, has_position_data = build_tree_index(
            annotated_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        visualized_files = tuple(
            VisualizedFile(
                revision_file=revision_file,
                tree=tree_by_unit.get(revision_file.unit),
            )
            for revision_file in revision_files
        )

        return VisualizationPayload(
            source_filename=filename,
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            has_position_data=has_position_data,
            files=visualized_files,
        )


def notify_progress(progress: ProgressCallback | None, message: str) -> None:
    if progress is not None:
        progress(message)


def build_annotated_srcdiff_xml(
    *,
    revision_0_dir: Path,
    revision_1_dir: Path,
    tmpdir: Path,
    progress: ProgressCallback | None = None,
) -> str:
    positioned_path = tmpdir / "positioned.srcdiff.xml"
    annotated_path = tmpdir / "annotated.srcdiff.xml"

    notify_progress(progress, "Running srcdiff with position data.")
    run_command(
        [
            "srcdiff",
            "--position",
            str(revision_0_dir),
            str(revision_1_dir),
            "-o",
            str(positioned_path),
        ]
    )

    notify_progress(progress, "Running srcMove annotations.")
    run_command(["srcMove", str(positioned_path), str(annotated_path)])
    notify_progress(progress, "Reading annotated srcdiff output.")

    return annotated_path.read_text(encoding="utf-8")
