"""Prepare retained history artifacts and compact source-alignment caches via HTTP."""

from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


def _request(
    base_url: str, path: str, deadline: float, *, method: str = "GET"
) -> dict[str, Any]:
    _remaining = deadline - time.monotonic()
    if _remaining <= 0:
        raise TimeoutError("Pair preparation timed out.")
    _request_value = Request(base_url.rstrip("/") + path, method=method)
    try:
        with urlopen(_request_value, timeout=_remaining) as _response:
            _payload = json.load(_response)
    except HTTPError as _error:
        raise RuntimeError(
            f"{method} {path}: HTTP {_error.code}: {_error.read(2048).decode(errors='replace')}"
        ) from _error
    if not isinstance(_payload, dict):
        raise ValueError(f"{path}: expected a JSON object.")
    return _payload


def _assert_run(document: dict[str, Any], repository: str, pair: int) -> dict[str, Any]:
    _run = document.get("run")
    if (
        document.get("schema_version") != 1
        or not isinstance(_run, dict)
        or not isinstance(_run.get("run_id"), str)
        or _run.get("kind") != "history-visualization"
        or _run.get("repository_id") != repository
        or _run.get("history_pair") != pair
        or _run.get("status")
        not in {"queued", "running", "completed", "failed", "cancelled"}
    ):
        raise ValueError("Unsupported or mismatched history run document.")
    return _run


def _selected_files(
    manifest: dict[str, Any], artifact_id: str, all_files: bool
) -> list[dict[str, Any]]:
    _files = manifest.get("files")
    _moves = manifest.get("moves")
    if (
        manifest.get("schema_version") != 5
        or manifest.get("projection_schema_version") != 2
        or manifest.get("artifact_id") != artifact_id
        or not isinstance(_files, list)
        or not isinstance(_moves, dict)
        or not isinstance(_moves.get("items"), list)
        or not isinstance(manifest.get("focus_profiles"), list)
        or "moves" not in manifest["focus_profiles"]
    ):
        raise ValueError("Unsupported or mismatched artifact manifest.")
    for _file in _files:
        if not isinstance(_file, dict) or not all(
            isinstance(_file.get(_key), str) for _key in ("file_id", "filename")
        ):
            raise ValueError("Invalid artifact file summary.")
    _known_ids = {_file["file_id"] for _file in _files}
    _endpoint_files: set[str] = set()
    for _move in _moves["items"]:
        if not isinstance(_move, dict):
            raise ValueError("Invalid artifact move summary.")
        for _direction in ("from_node_ids", "to_node_ids"):
            _nodes = _move.get(_direction)
            if not isinstance(_nodes, list):
                raise ValueError("Move summary requires explicit endpoint node IDs.")
            for _node in _nodes:
                if not isinstance(_node, str) or ":n" not in _node:
                    raise ValueError("Invalid move endpoint node ID.")
                _file_id = _node.rsplit(":n", 1)[0]
                if _file_id not in _known_ids:
                    raise ValueError(
                        "Move endpoint references an unknown artifact file."
                    )
                _endpoint_files.add(_file_id)
    return [
        _file for _file in _files if all_files or _file["file_id"] in _endpoint_files
    ]


def warm_pair(
    *,
    base_url: str,
    repository: str,
    pair: int,
    timeout: float,
    all_files: bool = False,
) -> dict[str, Any]:
    _started = time.monotonic()
    _deadline = _started + timeout
    _creation = _request(
        base_url,
        f"/api/history/pairs/{pair}/runs?{urlencode({'repository': repository})}",
        _deadline,
        method="POST",
    )
    _reuse = _creation.get("reuse")
    if _reuse not in {"new", "active-run", "artifact"}:
        raise ValueError("Unsupported run creation reuse value.")
    _run = _assert_run(_creation, repository, pair)
    while _run["status"] in {"queued", "running"}:
        if time.monotonic() >= _deadline:
            raise TimeoutError(
                "Pair preparation timed out; the durable run may still be running."
            )
        time.sleep(min(0.5, max(0, _deadline - time.monotonic())))
        _run = _assert_run(
            _request(
                base_url, f"/api/runs/{quote(_run['run_id'], safe='')}", _deadline
            ),
            repository,
            pair,
        )
    if _run["status"] != "completed":
        raise RuntimeError(f"History run {_run['status']}: {_run.get('diagnostic')}")
    _artifact_id = _run.get("artifact_id")
    if not isinstance(_artifact_id, str) or not _artifact_id:
        raise ValueError("Completed run has no artifact ID.")
    _artifact_ready = time.monotonic()
    _manifest = _request(
        base_url, f"/api/artifacts/{quote(_artifact_id, safe='')}", _deadline
    )
    _files = _selected_files(_manifest, _artifact_id, all_files)
    _manifest_ready = time.monotonic()
    _warmed = []
    for _file in _files:
        _file_started = time.monotonic()
        _source = _request(
            base_url,
            f"/api/artifacts/{quote(_artifact_id, safe='')}/files/{quote(_file['file_id'], safe='')}/source?focus=moves&context=3",
            _deadline,
        )
        if (
            _source.get("schema_version") != 1
            or _source.get("artifact_id") != _artifact_id
            or _source.get("file_id") != _file["file_id"]
            or _source.get("focus_profile") != "moves"
            or not isinstance(_source.get("blocks"), list)
        ):
            raise ValueError("Unsupported or mismatched source projection.")
        _warmed.append(
            {
                "filename": _file["filename"],
                "file_id": _file["file_id"],
                "seconds": round(time.monotonic() - _file_started, 3),
            }
        )
    return {
        "repository": repository,
        "pair": pair,
        "artifact_id": _artifact_id,
        "reuse": _reuse,
        "artifact_seconds": round(_artifact_ready - _started, 3),
        "manifest_seconds": round(_manifest_ready - _artifact_ready, 3),
        "source_seconds": round(time.monotonic() - _manifest_ready, 3),
        "total_seconds": round(time.monotonic() - _started, 3),
        "files": _warmed,
    }


def _positive_number(raw: str) -> float:
    _value = float(raw)
    if not 0 < _value < float("inf"):
        raise argparse.ArgumentTypeError("Value must be positive and finite.")
    return _value


def _positive_pair(raw: str) -> int:
    _value = int(raw)
    if _value <= 0:
        raise argparse.ArgumentTypeError("Pair numbers must be positive.")
    return _value


def main() -> int:
    _parser = argparse.ArgumentParser(description=__doc__)
    _parser.add_argument("--repository", required=True)
    _parser.add_argument("--pairs", required=True, nargs="+", type=_positive_pair)
    _parser.add_argument("--base-url", default="http://127.0.0.1:5000")
    _parser.add_argument(
        "--timeout",
        type=_positive_number,
        default=600,
        help="Maximum seconds per pair (default: 600).",
    )
    _parser.add_argument(
        "--all-files",
        action="store_true",
        help="Warm every file instead of move endpoint files only.",
    )
    _arguments = _parser.parse_args()
    _failed = False
    for _pair in dict.fromkeys(_arguments.pairs):
        try:
            _result = warm_pair(
                base_url=_arguments.base_url,
                repository=_arguments.repository,
                pair=_pair,
                timeout=_arguments.timeout,
                all_files=_arguments.all_files,
            )
            print(json.dumps(_result), flush=True)
        except (OSError, URLError, ValueError, RuntimeError) as _error:
            _failed = True
            print(
                f"{_arguments.repository} pair {_pair}: {_error}",
                file=sys.stderr,
                flush=True,
            )
    return int(_failed)


if __name__ == "__main__":
    raise SystemExit(main())
