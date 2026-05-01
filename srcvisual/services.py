from __future__ import annotations

import json
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str


def build_visualization_payload(*, filename: str, payload: bytes) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="srcvisual-") as tmpdir_name:
        tmpdir = Path(tmpdir_name)
        input_path = tmpdir / sanitize_filename(filename)
        annotated_path = tmpdir / "annotated.srcdiff.xml"
        input_path.write_bytes(payload)

        run_command(["srcMove", str(input_path), str(annotated_path)])

        archive_info = json.loads(run_command(["archive_reader", "--info", str(annotated_path)]).stdout)
        unit_count = int(archive_info["units"])
        files: list[dict[str, object]] = []

        for unit in range(1, unit_count + 1):
            unit_info = json.loads(
                run_command(["archive_reader", "--info", f"--unit={unit}", str(annotated_path)]).stdout
            )
            files.append(
                {
                    "unit": unit,
                    "filename": unit_info.get("filename", f"unit-{unit}"),
                    "language": unit_info.get("language"),
                    "before_source": run_command(
                        ["archive_reader", f"--unit={unit}", "--revision=0", "--output-src", str(annotated_path)]
                    ).stdout,
                    "after_source": run_command(
                        ["archive_reader", f"--unit={unit}", "--revision=1", "--output-src", str(annotated_path)]
                    ).stdout,
                }
            )

        if not files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        return {
            "source_filename": filename,
            "annotated_srcdiff_xml": annotated_path.read_text(encoding="utf-8"),
            "units": archive_info["units"],
            "files": files,
        }


def run_command(argv: list[str]) -> CommandResult:
    completed = subprocess.run(argv, check=True, capture_output=True, text=True)
    return CommandResult(stdout=completed.stdout, stderr=completed.stderr)


def sanitize_filename(filename: str) -> str:
    candidate = Path(filename).name
    if candidate:
        return candidate
    return "uploaded.srcdiff.xml"
