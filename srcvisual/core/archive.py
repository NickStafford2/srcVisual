from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .commands import run_command
from .models import RevisionFile
from .source_files import write_source_file


def extract_revision_files(
    *,
    input_path: Path,
    revision_zero_dir: Path,
    revision_one_dir: Path,
) -> tuple[RevisionFile, ...]:
    archive_info = read_archive_info(input_path)
    unit_count = int(archive_info["units"])

    files: list[RevisionFile] = []

    for unit in range(1, unit_count + 1):
        unit_info = get_unit_info(input_path, unit)
        filename = get_unit_filename(unit_info, unit)
        language = get_unit_language(unit_info)

        revision_0_source_code = read_unit_revision(
            input_path=input_path,
            unit=unit,
            revision=0,
        )
        revision_1_source_code = read_unit_revision(
            input_path=input_path,
            unit=unit,
            revision=1,
        )

        write_source_file(revision_zero_dir / filename, revision_0_source_code)
        write_source_file(revision_one_dir / filename, revision_1_source_code)

        files.append(
            RevisionFile(
                unit=unit,
                filename=filename,
                language=language,
                revision_0_source_code=revision_0_source_code,
                revision_1_source_code=revision_1_source_code,
            )
        )

    return tuple(files)


def read_archive_info(input_path: Path) -> dict[str, Any]:
    return json.loads(run_command(["archive_reader", "--info", str(input_path)]).stdout)


def get_unit_info(input_path: Path, unit: int) -> dict[str, Any]:
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


def get_unit_filename(unit_info: dict[str, Any], unit: int) -> str:
    filename = unit_info.get("filename")

    if isinstance(filename, str) and filename:
        return filename

    return f"unit-{unit}.cpp"


def get_unit_language(unit_info: dict[str, Any]) -> str | None:
    language = unit_info.get("language")

    if isinstance(language, str) and language:
        return language

    return None


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
