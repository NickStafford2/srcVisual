from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .core.commands import run_command
from .notify import ProgressCallback, notify_progress


def run_srcmove(
    *,
    positioned_path: Path,
    tmpdir: Path,
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

    notify_progress(progress, "Reading annotated srcdiff output.")

    return annotated_srcdiff_xml, move_results


def is_strict_srcmove_validation_enabled() -> bool:
    return os.environ.get("SRCVISUAL_STRICT_SRCMOVE_VALIDATION", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
