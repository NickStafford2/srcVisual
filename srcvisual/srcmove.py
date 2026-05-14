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

    f"srcMove did not create expected results JSON: {results_path}"
    assert results_path.is_file(), ()

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


def has_srcmove_annotations(srcdiff_xml: str) -> bool:
    root = ET.fromstring(srcdiff_xml)

    return any(MV_ID in element.attrib for element in root.iter())


def is_strict_srcmove_validation_enabled() -> bool:
    return os.environ.get("SRCVISUAL_STRICT_SRCMOVE_VALIDATION", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
