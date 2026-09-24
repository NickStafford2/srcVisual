from __future__ import annotations

import json
import os
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from srcvisual.core.commands import BackendCommandError, run_command


DEFAULT_HISTORY_COMMAND = "srcmove-history"


class HistoryConfigurationError(ValueError):
    """The configured history repository is unavailable or invalid."""


class HistoryResponseError(RuntimeError):
    """srcmove-history returned output outside its versioned JSON contract."""


def get_history_repository() -> Path | None:
    _raw_repository = os.environ.get("SRCVISUAL_HISTORY_REPOSITORY", "").strip()
    if not _raw_repository:
        return None
    if "\0" in _raw_repository:
        raise ValueError("SRCVISUAL_HISTORY_REPOSITORY contains an invalid null byte.")
    return Path(_raw_repository).expanduser().absolute()


def read_history_status(repository: Path) -> dict[str, Any]:
    return _run_json_command(
        repository,
        ("status", "--format", "json"),
        expected_schema_version=2,
    )


def read_history_pairs(
    repository: Path,
    *,
    selection: str,
    limit: int,
    after: int | None,
    oldest_first: bool,
) -> dict[str, Any]:
    if selection not in {"all", "moves", "failed"}:
        raise ValueError(f"Unsupported history pair selection: {selection!r}")
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
        raise ValueError("History pair limit must be between 1 and 100.")
    if after is not None and (
        isinstance(after, bool) or not isinstance(after, int) or after <= 0
    ):
        raise ValueError("History pair cursor must be a positive integer.")

    arguments = ["list"]
    if selection == "moves":
        arguments.append("--moves")
    elif selection == "failed":
        arguments.append("--failed")
    arguments.extend(("--limit", str(limit)))
    if after is not None:
        arguments.extend(("--after", str(after)))
    if oldest_first:
        arguments.append("--oldest-first")
    arguments.extend(("--format", "json"))

    return _run_json_command(
        repository,
        arguments,
        expected_schema_version=1,
    )


def read_history_pair(repository: Path, pair_number: int) -> dict[str, Any]:
    if (
        isinstance(pair_number, bool)
        or not isinstance(pair_number, int)
        or pair_number <= 0
    ):
        raise ValueError("History pair number must be a positive integer.")
    return _run_json_command(
        repository,
        ("show", str(pair_number), "--format", "json"),
        expected_schema_version=1,
    )


def materialize_history_pair(repository: Path, pair_number: int) -> Path:
    if (
        isinstance(pair_number, bool)
        or not isinstance(pair_number, int)
        or pair_number <= 0
    ):
        raise ValueError("History pair number must be a positive integer.")
    document = _run_json_command(
        repository,
        (
            "compare",
            "--pair",
            str(pair_number),
            "--save",
            "all",
            "--format",
            "json",
        ),
        expected_schema_version=1,
    )
    comparison = document.get("comparison")
    if not isinstance(comparison, dict):
        raise HistoryResponseError(
            "srcmove-history comparison response is missing `comparison`."
        )
    if comparison.get("status") != "completed":
        detail = comparison.get("error")
        suffix = f": {detail}" if isinstance(detail, str) and detail else "."
        raise HistoryResponseError(
            "srcmove-history could not materialize this commit pair" + suffix
        )

    saved_paths = comparison.get("saved_paths")
    if not isinstance(saved_paths, list) or not all(
        isinstance(path, str) for path in saved_paths
    ):
        raise HistoryResponseError(
            "srcmove-history comparison response has invalid saved paths."
        )
    resolved_repository = _validated_repository(repository)
    comparison_root = (resolved_repository / ".srcmove" / "comparisons").resolve()
    candidates = []
    for raw_path in saved_paths:
        candidate = Path(raw_path).resolve(strict=True)
        if not candidate.is_relative_to(comparison_root):
            raise HistoryResponseError(
                "srcmove-history returned an artifact outside its comparison directory."
            )
        if candidate.name == "srcmove.xml":
            candidates.append(candidate)
    if len(candidates) != 1 or not candidates[0].is_file():
        raise HistoryResponseError(
            "srcmove-history did not produce exactly one srcmove.xml artifact."
        )
    return candidates[0]


def read_materialized_move_results(artifact: Path) -> dict[str, Any] | None:
    _results_path = artifact.with_name("results.json")
    if not _results_path.is_file():
        return None
    try:
        _document = json.loads(_results_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as _error:
        raise HistoryResponseError(
            "Retained srcMove results.json is malformed."
        ) from _error
    if not isinstance(_document, dict):
        raise HistoryResponseError(
            "Retained srcMove results.json must contain an object."
        )
    return _document


def _run_json_command(
    repository: Path,
    arguments: Sequence[str],
    *,
    expected_schema_version: int,
) -> dict[str, Any]:
    resolved_repository = _validated_repository(repository)
    command = os.environ.get(
        "SRCVISUAL_HISTORY_COMMAND",
        DEFAULT_HISTORY_COMMAND,
    ).strip()
    if not command or "\0" in command:
        raise HistoryConfigurationError(
            "SRCVISUAL_HISTORY_COMMAND must name one executable."
        )

    result = run_command([command, "-C", str(resolved_repository), *arguments])
    try:
        document = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise HistoryResponseError(
            "srcmove-history returned malformed JSON."
        ) from error
    if not isinstance(document, dict):
        raise HistoryResponseError(
            "srcmove-history JSON output must contain an object."
        )
    if document.get("schema_version") != expected_schema_version:
        raise HistoryResponseError(
            "Unsupported srcmove-history JSON schema: "
            f"expected {expected_schema_version}, "
            f"received {document.get('schema_version')!r}."
        )
    return document


def _validated_repository(repository: Path) -> Path:
    try:
        resolved = repository.expanduser().resolve(strict=True)
    except FileNotFoundError as error:
        raise HistoryConfigurationError(
            f"Configured history repository does not exist: {repository}"
        ) from error
    if not resolved.is_dir():
        raise HistoryConfigurationError(
            f"Configured history repository is not a directory: {resolved}"
        )
    database = resolved / ".srcmove" / "analysis.sqlite3"
    if not database.is_file():
        raise HistoryConfigurationError(
            "Configured history repository has no .srcmove/analysis.sqlite3: "
            f"{resolved}"
        )
    return resolved


def history_error_response(error: Exception) -> tuple[dict[str, str], int]:
    if isinstance(error, HistoryConfigurationError):
        return {"error": str(error)}, 503
    if isinstance(error, BackendCommandError):
        return {"error": error.user_message()}, 502
    if isinstance(error, HistoryResponseError):
        return {"error": str(error)}, 502
    raise error
