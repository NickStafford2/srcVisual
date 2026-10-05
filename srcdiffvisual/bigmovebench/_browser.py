"""Adapter to the srcMove-owned, read-only BigMoveBench JSON interface."""

from __future__ import annotations

import json
import os
import sys

from srcdiffvisual.core.commands import BackendCommandError, run_command
from srcdiffvisual.srcmove.srcmove_results import (
    CONTENT_RELATIONSHIPS,
    validate_classification_fields,
    validate_producer_results,
)


def read_benchmark(command: str, *arguments: str) -> dict:
    _results = os.environ.get("SRCDIFFVISUAL_BIGMOVEBENCH_RESULTS_ROOT", "")
    _cache = os.environ.get("SRCDIFFVISUAL_BIGMOVEBENCH_CACHE_ROOT", "")
    if not _results or not _cache:
        if command == "list-runs":
            return {"schema_version": 2, "items": [], "default_run_id": None}
        raise ValueError(
            "The local BigMoveBench results and cache roots are not configured."
        )
    try:
        _result = run_command(
            [
                sys.executable,
                "-m",
                "bigMoveBench.browser",
                "--results-root",
                _results,
                "--cache-root",
                _cache,
                command,
                *arguments,
            ]
        )
        _payload = json.loads(_result.stdout)
    except BackendCommandError as _error:
        if _error.returncode != 2:
            raise RuntimeError("Unable to launch the BigMoveBench reader.") from _error
        _payload = json.loads(_error.stdout)
    if not isinstance(_payload, dict) or _payload.get("schema_version") != 2:
        raise RuntimeError(
            "Unsupported BigMoveBench browser response. Rebuild the application and regenerate benchmark collections and runs in a new directory."
        )
    if "error" in _payload:
        if _payload.get("error_kind") == "not_found":
            raise FileNotFoundError(_payload["error"])
        raise ValueError(_payload["error"])
    validate_classification_fields(_payload)
    _cases = (
        _payload.get("items", [])
        if command == "list-cases"
        else [_payload.get("case")]
        if command == "show-case"
        else []
    )
    for _case in _cases:
        if not isinstance(_case, dict) or not all(
            _key in _case
            for _key in (
                "expected_content_relationship",
                "reviewed_expected_content_relationship",
                "observed_content_relationship",
            )
        ):
            raise ValueError(
                "Benchmark case is missing content relationship classifications; regenerate the collection and run."
            )
    if command == "show-case":
        _moves = _payload.get("moves")
        if not isinstance(_moves, list) or any(
            not isinstance(_move, dict)
            or not isinstance(_move.get("content_relationship"), str)
            or _move["content_relationship"] not in CONTENT_RELATIONSHIPS
            for _move in _moves
        ):
            raise ValueError(
                "Benchmark reported moves require detector content_relationship predictions; regenerate the run."
            )
    if command == "show-source":
        validate_producer_results(_payload.get("results", {}))
    return _payload
