from __future__ import annotations

import json
from pathlib import Path

from .commands import run_command
from .source_files import write_source_file


def extract_revision_files(
    *,
    input_path: Path,
    revision_zero_dir: Path,
    revision_one_dir: Path,
) -> list[dict[str, object]]:
    archive_info = json.loads(
        run_command(["archive_reader", "--info", str(input_path)]).stdout
    )

    unit_count = int(archive_info["units"])
    files: list[dict[str, object]] = []

    for unit in range(1, unit_count + 1):
        unit_info = get_unit_info(input_path, unit)
        filename = unit_info.get("filename", f"unit-{unit}.cpp")

        source_code_before = read_unit_revision(
            input_path=input_path,
            unit=unit,
            revision=0,
        )
        source_code_after = read_unit_revision(
            input_path=input_path,
            unit=unit,
            revision=1,
        )

        write_source_file(revision_zero_dir / filename, source_code_before)
        write_source_file(revision_one_dir / filename, source_code_after)

        files.append(
            {
                "unit": unit,
                "filename": filename,
                "language": unit_info.get("language"),
                "source_code_before": source_code_before,
                "source_code_after": source_code_after,
            }
        )

    return files


def get_unit_info(input_path: Path, unit: int) -> dict[str, object]:
    return json.loads(
        run_command(
            [
                "archive_reader",
                "--info",
                f"--unit={unit}",
                str(input_path),
            ]
        ).stdout
    )


def read_unit_revision(*, input_path: Path, unit: int, revision: int) -> str:
    return run_command(
        [
            "archive_reader",
            f"--unit={unit}",
            f"--revision={revision}",
            "--output-src",
            str(input_path),
        ]
    ).stdout
