from __future__ import annotations

import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from .core.commands import run_command
from .core.srcdiff_attributes import MV_ID
from .core.srcdiff_restore import restore_original_srcdiff_metadata
from .core.validation import (
    build_filename_to_unit_index,
    collect_xml_move_regions,
)
from .notify import ProgressCallback, notify_progress


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
