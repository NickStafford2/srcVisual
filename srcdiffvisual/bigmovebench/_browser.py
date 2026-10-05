"""Adapter to the srcMove-owned, read-only BigMoveBench JSON interface."""
from __future__ import annotations

import json
import os
import sys

from srcdiffvisual.core.commands import BackendCommandError, run_command


def read_benchmark(command: str, *arguments: str) -> dict:
    _results = os.environ.get("SRCDIFFVISUAL_BIGMOVEBENCH_RESULTS_ROOT", "")
    _cache = os.environ.get("SRCDIFFVISUAL_BIGMOVEBENCH_CACHE_ROOT", "")
    if not _results or not _cache:
        if command == "list-runs":
            return {"schema_version": 1, "items": [], "default_run_id": None}
        raise ValueError("The local BigMoveBench results and cache roots are not configured.")
    try:
        _result = run_command([
            sys.executable, "-m", "bigMoveBench.browser",
            "--results-root", _results, "--cache-root", _cache,
            command, *arguments,
        ])
        _payload = json.loads(_result.stdout)
    except BackendCommandError as _error:
        if _error.returncode != 2:
            raise RuntimeError("Unable to launch the BigMoveBench reader.") from _error
        _payload = json.loads(_error.stdout)
    if not isinstance(_payload, dict) or _payload.get("schema_version") != 1:
        raise RuntimeError("Unsupported BigMoveBench browser response.")
    if "error" in _payload:
        if _payload.get("error_kind") == "not_found":
            raise FileNotFoundError(_payload["error"])
        raise ValueError(_payload["error"])
    return _payload
