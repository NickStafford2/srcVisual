from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Callable
import xml.etree.ElementTree as ET

from .core.archive import extract_revision_files
from .core.commands import run_command
from .core.filenames import sanitize_filename
from .core.models import RevisionFile, VisualizationPayload, VisualizedFile
from .core.namespaces import SRC_NS
from .core.tree_builder import build_tree_index
from .core.validation import (
    augment_move_results_with_node_ids,
    validate_annotated_srcdiff_and_tree,
    validate_srcmove_results_match_xml,
    validate_visualization_payload,
    validate_xml_span_index,
)

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

        annotated_srcdiff_xml, move_results = build_annotated_srcdiff_xml(
            revision_0_dir=revision_0_dir,
            revision_1_dir=revision_1_dir,
            tmpdir=tmpdir,
            progress=progress,
        )

        notify_progress(progress, "Validating srcMove results against annotated XML.")
        validate_srcmove_results_match_xml(
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            move_results=move_results,
            include_skipped_tags=include_skipped_tags,
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

        notify_progress(progress, "Validating annotated XML against tree data.")
        validate_annotated_srcdiff_and_tree(
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            revision_files=revision_files,
            visualized_files=visualized_files,
            include_skipped_tags=include_skipped_tags,
        )

        result = VisualizationPayload(
            source_filename=filename,
            annotated_srcdiff_xml=annotated_srcdiff_xml,
            move_results=move_results,
            has_position_data=has_position_data,
            files=visualized_files,
        )

        notify_progress(progress, "Validating frontend payload contract.")
        validate_visualization_payload(result)

        return result


def notify_progress(progress: ProgressCallback | None, message: str) -> None:
    if progress is not None:
        progress(message)


def build_visualized_files(
    *,
    annotated_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    tree_by_unit: dict[int, dict[str, object]],
) -> tuple[VisualizedFile, ...]:
    annotated_filenames = read_annotated_unit_filenames(annotated_srcdiff_xml)
    revision_file_by_filename: dict[str, RevisionFile] = {}

    for revision_file in revision_files:
        assert revision_file.filename not in revision_file_by_filename, (
            f"Duplicate extracted revision filename: {revision_file.filename!r}."
        )
        revision_file_by_filename[revision_file.filename] = revision_file

    visualized_files: list[VisualizedFile] = []

    for unit_id, filename in enumerate(annotated_filenames, start=1):
        revision_file = revision_file_by_filename.pop(filename, None)

        assert revision_file is not None, (
            "Annotated srcdiff unit filename is missing from extracted revisions: "
            f"{filename!r}."
        )

        visualized_files.append(
            VisualizedFile(
                revision_file=RevisionFile(
                    unit_id=unit_id,
                    filename=revision_file.filename,
                    language=revision_file.language,
                    revision_0_source_code=revision_file.revision_0_source_code,
                    revision_1_source_code=revision_file.revision_1_source_code,
                ),
                tree=tree_by_unit.get(unit_id),
            )
        )

    assert not revision_file_by_filename, (
        "Extracted revision files were not all present in the annotated srcdiff "
        f"output: {sorted(revision_file_by_filename)}."
    )

    return tuple(visualized_files)


def read_annotated_unit_filenames(annotated_srcdiff_xml: str) -> tuple[str, ...]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]

    filenames: list[str] = []

    for unit_index, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename")

        assert isinstance(filename, str) and filename, (
            "Annotated srcdiff unit is missing a filename attribute at "
            f"index {unit_index}."
        )

        filenames.append(filename)

    return tuple(filenames)


def build_annotated_srcdiff_xml(
    *,
    revision_0_dir: Path,
    revision_1_dir: Path,
    tmpdir: Path,
    progress: ProgressCallback | None = None,
) -> tuple[str, dict[str, object]]:
    positioned_path = tmpdir / "positioned.srcdiff.xml"
    annotated_path = tmpdir / "annotated.srcdiff.xml"
    results_path = tmpdir / "results.json"

    notify_progress(progress, "Running srcdiff with position data.")
    _ = run_command(
        [
            "srcdiff",
            "--position",
            str(revision_0_dir),
            str(revision_1_dir),
            "-o",
            str(positioned_path),
        ]
    )

    assert positioned_path.is_file(), (
        f"srcdiff did not create expected positioned output: {positioned_path}"
    )

    assert positioned_path.read_text(encoding="utf-8").strip(), (
        f"srcdiff created an empty positioned output: {positioned_path}"
    )

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

    notify_progress(progress, "Reading annotated srcdiff output.")

    return annotated_srcdiff_xml, move_results
