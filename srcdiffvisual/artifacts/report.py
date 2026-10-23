"""Read retained producer results without reconstructing a missing report."""
from __future__ import annotations

from contextlib import closing
import json
from pathlib import Path
from typing import Any

from srcdiffvisual.artifacts.projections import _open_artifact
from srcdiffvisual.artifacts.store import ArtifactIntegrityError, _connect_readonly

MAX_PREVIEW_CHARACTERS = 256 * 1024


def read_report_document(*, artifact_root: Path, artifact_id: str) -> dict[str, Any] | None:
    _path, _ = _open_artifact(artifact_root, artifact_id)
    with closing(_connect_readonly(_path / "index.sqlite")) as _database:
        _row = _database.execute("SELECT value FROM metadata WHERE key = 'move_results'").fetchone()
    if _row is None:
        raise ArtifactIntegrityError("Artifact move results are missing.")
    _results = json.loads(_row[0])
    if not isinstance(_results, dict):
        raise ArtifactIntegrityError("Artifact move results must contain an object.")
    _producer = _results.get("producer_metadata")
    if _producer is None and "results_schema_version" in _results:
        _producer = _results
    if _producer is None:
        return None
    if not isinstance(_producer, dict) or _producer.get("results_schema_version") != 3:
        raise ArtifactIntegrityError("Unsupported retained producer report.")
    # This viewer-added map is not part of the producer's results.json.
    return {_key: _value for _key, _value in _producer.items() if _key != "visualization_candidate_locations"}


def read_report_projection(*, artifact_root: Path, artifact_id: str) -> dict[str, Any]:
    _report = read_report_document(artifact_root=artifact_root, artifact_id=artifact_id)
    _chunks = []
    _remaining = MAX_PREVIEW_CHARACTERS
    _truncated = False
    if _report is not None:
        for _chunk in json.JSONEncoder(indent=2, ensure_ascii=False).iterencode(_report):
            _chunks.append(_chunk[:_remaining])
            _remaining -= len(_chunk)
            if _remaining < 0:
                _truncated = True
                break
    return {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "available": _report is not None,
        "diagnostics_available": _report is not None and _report.get("diagnostics") is not None,
        "text": "".join(_chunks),
        "truncated": _truncated,
    }
