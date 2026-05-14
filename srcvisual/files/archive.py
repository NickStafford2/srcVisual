from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

from ..core.commands import run_command
from ..core.models import RevisionFile
from ._source_files import write_source_file


@dataclass(frozen=True)
class ExtractedRevisionLayout:
    files: tuple[RevisionFile, ...]
    revision_0_input: Path
    revision_1_input: Path


def extract_revision_files(
    *,
    input_path: Path,
    revision_0_dir: Path,
    revision_1_dir: Path,
) -> ExtractedRevisionLayout:
    archive_info = read_archive_info(input_path)
    unit_count = int(archive_info["units"])

    files: list[RevisionFile] = []
    archive_kind = detect_archive_kind(archive_info)
    if archive_kind == "file":
        assert unit_count == 1, (
            "Single-file srcdiff archives must contain exactly one unit. "
            f"Got {unit_count} units."
        )
    revision_0_input, revision_1_input = resolve_srcdiff_inputs(
        archive_info=archive_info,
        revision_0_dir=revision_0_dir,
        revision_1_dir=revision_1_dir,
    )

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

        revision_0_output, revision_1_output = resolve_revision_output_paths(
            archive_kind=archive_kind,
            unit_info=unit_info,
            unit=unit,
            revision_0_dir=revision_0_dir,
            revision_1_dir=revision_1_dir,
            revision_0_input=revision_0_input,
            revision_1_input=revision_1_input,
        )

        if revision_0_output is not None:
            write_source_file(revision_0_output, revision_0_source_code)

        if revision_1_output is not None:
            write_source_file(revision_1_output, revision_1_source_code)

        files.append(
            RevisionFile(
                unit_id=unit,
                filename=filename,
                language=language,
                revision_0_source_code=revision_0_source_code,
                revision_1_source_code=revision_1_source_code,
            )
        )

    return ExtractedRevisionLayout(
        files=tuple(files),
        revision_0_input=revision_0_input,
        revision_1_input=revision_1_input,
    )


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


def detect_archive_kind(archive_info: dict[str, Any]) -> str:
    if isinstance(archive_info.get("url"), str) and archive_info["url"]:
        return "directory"

    return "file"


def resolve_srcdiff_inputs(
    *,
    archive_info: dict[str, Any],
    revision_0_dir: Path,
    revision_1_dir: Path,
) -> tuple[Path, Path]:
    if detect_archive_kind(archive_info) == "directory":
        return revision_0_dir, revision_1_dir

    raw_filename = archive_info.get("filename")
    left_name, right_name = split_revision_pair(
        raw_filename if isinstance(raw_filename, str) else ""
    )
    revision_0_input = revision_0_dir / choose_single_file_name(left_name, 0)
    revision_1_input = revision_1_dir / choose_single_file_name(right_name, 1)
    return revision_0_input, revision_1_input


def resolve_revision_output_paths(
    *,
    archive_kind: str,
    unit_info: dict[str, Any],
    unit: int,
    revision_0_dir: Path,
    revision_1_dir: Path,
    revision_0_input: Path,
    revision_1_input: Path,
) -> tuple[Path | None, Path | None]:
    if archive_kind == "file":
        return revision_0_input, revision_1_input

    raw_filename = get_unit_filename(unit_info, unit)
    left_name, right_name = split_revision_pair(raw_filename)
    revision_0_output = (
        revision_0_dir / normalize_relative_revision_path(left_name)
        if left_name
        else None
    )
    revision_1_output = (
        revision_1_dir / normalize_relative_revision_path(right_name)
        if right_name
        else None
    )
    return revision_0_output, revision_1_output


def split_revision_pair(value: str) -> tuple[str, str]:
    if "|" not in value:
        return value, value

    left, right = value.split("|", 1)
    return left, right


def choose_single_file_name(raw_path: str, revision: int) -> str:
    candidate = Path(raw_path).name

    if candidate:
        return candidate

    return f"unit-{revision}.cpp"


def normalize_relative_revision_path(raw_path: str) -> Path:
    path = Path(raw_path)

    if not path.is_absolute():
        return path

    parts = [part for part in path.parts if part not in {path.anchor, "/"}]
    return Path(*parts) if parts else Path(path.name or "unit.cpp")
