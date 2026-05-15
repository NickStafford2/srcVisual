from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from srcvisual.core.commands import run_command
from srcvisual.core._notify import ProgressCallback, notify_progress


def run_srcmove(
    *,
    positioned_path: Path,
    tmpdir: Path,
    progress: ProgressCallback | None = None,
) -> tuple[str, dict[str, Any]]:
    moved_path = tmpdir / "moved.srcdiff.xml"
    results_path = tmpdir / "results.json"

    notify_progress(progress, "Running srcMove annotations.")
    _ = run_command(
        [
            "srcMove",
            str(positioned_path),
            str(moved_path),
            "--results",
            str(results_path),
        ]
    )

    assert moved_path.is_file(), (
        f"srcMove did not create expected moved output: {moved_path}"
    )

    f"srcMove did not create expected results JSON: {results_path}"
    assert results_path.is_file(), ()

    moved_srcdiff_xml = moved_path.read_text(encoding="utf-8")
    results_text = results_path.read_text(encoding="utf-8")

    assert moved_srcdiff_xml.strip(), (
        f"srcMove created an empty moved output: {moved_path}"
    )

    assert results_text.strip(), (
        f"srcMove created an empty results file: {results_path}"
    )

    move_results = json.loads(results_text)

    assert isinstance(move_results, dict), (
        f"srcMove results JSON must be an object; got {type(move_results).__name__}."
    )

    notify_progress(progress, "Reading moved srcdiff output.")

    return moved_srcdiff_xml, move_results


def is_strict_srcmove_validation_enabled() -> bool:
    return os.environ.get("SRCVISUAL_STRICT_SRCMOVE_VALIDATION", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
