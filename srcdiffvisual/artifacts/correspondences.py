"""Bounded, read-only views of opt-in srcMove correspondence diagnostics."""

from __future__ import annotations

from contextlib import closing
import json
from pathlib import Path
from typing import Any

from srcdiffvisual.artifacts.projections import _open_artifact
from srcdiffvisual.artifacts.store import ArtifactIntegrityError, _connect_readonly


def _read_diagnostics(root: Path, artifact_id: str) -> dict[str, Any] | None:
    _path, _ = _open_artifact(root, artifact_id)
    with closing(_connect_readonly(_path / "index.sqlite")) as _db:
        _row = _db.execute(
            "SELECT value FROM metadata WHERE key = 'move_results'"
        ).fetchone()
    if _row is None:
        raise ArtifactIntegrityError("Artifact move results are missing.")
    _results = json.loads(_row[0])
    _producer = _results.get("producer_metadata", _results)
    _diagnostics = _producer.get("diagnostics")
    if _diagnostics is None:
        return None
    if not isinstance(_diagnostics, dict) or _diagnostics.get("schema_version") != 4:
        raise ArtifactIntegrityError(
            "Unsupported correspondence diagnostics schema; expected version 4. Regenerate with the current srcMove."
        )
    _candidates = _diagnostics.get("candidates")
    _pairs = _diagnostics.get("correspondences")
    if not isinstance(_candidates, list) or not isinstance(_pairs, list):
        raise ArtifactIntegrityError("Invalid correspondence diagnostics collections.")
    _by_id = {}
    for _candidate in _candidates:
        if (
            not isinstance(_candidate, dict)
            or type(_candidate.get("candidate_id")) is not int
        ):
            raise ArtifactIntegrityError("Invalid diagnostic candidate identity.")
        _id = _candidate["candidate_id"]
        if _id in _by_id or any(
            not isinstance(_candidate.get(_key), str)
            for _key in ("side", "filename", "xpath", "construct", "raw_text")
        ):
            raise ArtifactIntegrityError("Invalid or duplicate diagnostic candidate.")
        _by_id[_id] = _candidate
    for _pair in _pairs:
        if not isinstance(_pair, dict) or any(
            not isinstance(_pair.get(_key), str)
            for _key in (
                "correspondence_kind",
                "shadow_change",
                "current_result",
                "classification_reason",
                "cardinality",
            )
        ):
            raise ArtifactIntegrityError("Invalid diagnostic correspondence.")
        for _key, _side in (
            ("delete_candidate_id", "delete"),
            ("insert_candidate_id", "insert"),
        ):
            _id = _pair.get(_key)
            if (
                type(_id) is not int
                or _id not in _by_id
                or _by_id[_id]["side"] != _side
            ):
                raise ArtifactIntegrityError(
                    "Correspondence references a missing or incorrect endpoint."
                )
    with closing(_connect_readonly(_path / "index.sqlite")) as _db:
        _files = dict(_db.execute("SELECT unit_id, file_id FROM files"))
    _locations = {}
    for _id, _location in _producer.get(
        "visualization_candidate_locations", {}
    ).items():
        _locations[int(_id)] = {
            **_location,
            "file_id": _files.get(_location["unit_id"]),
        }
    return {"pairs": _pairs, "candidates": _by_id, "locations": _locations}


def read_correspondences(
    *,
    artifact_root: Path,
    artifact_id: str,
    offset: int = 0,
    limit: int = 50,
    query: str = "",
    kind: str = "",
    classification: str = "",
    outcome: str = "",
) -> dict[str, Any]:
    if offset < 0 or not 1 <= limit <= 100 or len(query) > 200:
        raise ValueError("Invalid correspondence page or search length.")
    _data = _read_diagnostics(artifact_root, artifact_id)
    _response = {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "available": _data is not None,
        "items": [],
        "total": 0,
        "matched": 0,
        "next_offset": None,
        "filters": {"kinds": [], "classifications": [], "outcomes": []},
    }
    if _data is None:
        return _response
    _pairs = _data["pairs"]
    _candidates = _data["candidates"]
    _items = []
    for _index, _pair in enumerate(_pairs):
        _before = _candidates[_pair["delete_candidate_id"]]
        _after = _candidates[_pair["insert_candidate_id"]]
        if kind and _pair["correspondence_kind"] != kind:
            continue
        if classification and _pair["shadow_change"] != classification:
            continue
        if outcome and _pair["current_result"] != outcome:
            continue
        _search = " ".join(
            [
                str(_index + 1),
                _before["filename"],
                _after["filename"],
                _before["construct"],
                _after["construct"],
                _pair["classification_reason"],
            ]
        )
        if query.casefold() not in _search.casefold():
            continue
        _items.append(
            {
                "id": _index,
                "kind": _pair["correspondence_kind"],
                "classification": _pair["shadow_change"],
                "outcome": _pair["current_result"],
                "reason": _pair["classification_reason"],
                "cardinality": _pair["cardinality"],
                "before_file": _before["filename"],
                "after_file": _after["filename"],
                "before_location": _location(_data, _before["candidate_id"]),
                "after_location": _location(_data, _after["candidate_id"]),
            }
        )
    _response.update(
        total=len(_pairs),
        matched=len(_items),
        items=_items[offset : offset + limit],
        next_offset=offset + limit if offset + limit < len(_items) else None,
        filters={
            "kinds": sorted({_p["correspondence_kind"] for _p in _pairs}),
            "classifications": sorted({_p["shadow_change"] for _p in _pairs}),
            "outcomes": sorted({_p["current_result"] for _p in _pairs}),
        },
    )
    return _response


def read_correspondence(
    *, artifact_root: Path, artifact_id: str, index: int
) -> dict[str, Any]:
    _data = _read_diagnostics(artifact_root, artifact_id)
    if _data is None or not 0 <= index < len(_data["pairs"]):
        raise FileNotFoundError("Correspondence does not exist in this artifact.")
    _pair = _data["pairs"][index]

    def _endpoint(candidate_id: int) -> dict[str, Any]:
        _candidate = _data["candidates"][candidate_id]
        _text = _candidate["raw_text"]
        return {
            **_candidate,
            "source_location": _location(_data, candidate_id),
            "raw_text": _text[:20000],
            "text_length": len(_text),
            "text_truncated": len(_text) > 20000,
        }

    return {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "id": index,
        "evidence": _pair,
        "before": _endpoint(_pair["delete_candidate_id"]),
        "after": _endpoint(_pair["insert_candidate_id"]),
    }


def _location(data: dict[str, Any], candidate_id: int) -> dict[str, Any]:
    return data["locations"].get(
        candidate_id,
        {
            "file_id": None,
            "span": None,
            "reason": "Source locations were not recorded. Rerun with correspondence diagnostics.",
        },
    )
