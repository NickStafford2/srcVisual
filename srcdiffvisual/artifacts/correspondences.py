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
    from srcdiffvisual.srcmove.srcmove_results import validate_producer_results
    _contract = { _key: _value for _key, _value in _producer.items()
                  if _key != "visualization_candidate_locations" }
    try:
        validate_producer_results(_contract)
    except ValueError as _error:
        raise ArtifactIntegrityError(str(_error)) from _error
    _selected = {_endpoint["candidate_id"]: _endpoint
                 for _group in _producer["atomic_move_groups"]
                 for _side in ("original", "modified") for _endpoint in _group[_side]}
    _by_id = {}
    for _candidate in _diagnostics["candidates"]:
        _id = _candidate["candidate_id"]
        _endpoint = (_selected[_id] if _candidate["selected_group_id"] is not None
                     else _candidate["endpoint"])
        _by_id[_id] = {**_candidate, **_endpoint, "filename": _endpoint["revision_file"]}
    _pairs = _diagnostics["correspondences"]
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
        "schema_version": 2,
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
    for _pair in _pairs:
        _before = _candidates[_pair["original_candidate_id"]]
        _after = _candidates[_pair["modified_candidate_id"]]
        if kind and _pair["content_relationship"] != kind:
            continue
        if classification and _pair["location"]["classification"] != classification:
            continue
        if outcome and _pair["selection"]["status"] != outcome:
            continue
        _search = " ".join(
            [
                _pair["id"],
                _before["filename"] or "",
                _after["filename"] or "",
                _before["construct"] or "",
                _after["construct"] or "",
                _pair["location"]["reason"],
            ]
        )
        if query.casefold() not in _search.casefold():
            continue
        _items.append(
            {
                "id": _pair["id"],
                "kind": _pair["content_relationship"],
                "classification": _pair["location"]["classification"],
                "outcome": _pair["selection"]["status"],
                "reason": _pair["location"]["reason"],
                "cardinality": "1-to-1",
                "before_file": _before["filename"] or "",
                "after_file": _after["filename"] or "",
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
            "kinds": sorted({_p["content_relationship"] for _p in _pairs}),
            "classifications": sorted({_p["location"]["classification"] for _p in _pairs}),
            "outcomes": sorted({_p["selection"]["status"] for _p in _pairs}),
        },
    )
    return _response


def read_correspondence(
    *, artifact_root: Path, artifact_id: str, index: str
) -> dict[str, Any]:
    _data = _read_diagnostics(artifact_root, artifact_id)
    _pair = next((_pair for _pair in _data["pairs"] if _pair["id"] == index), None) if _data else None
    if _pair is None:
        raise FileNotFoundError("Correspondence does not exist in this artifact.")

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
        "schema_version": 2,
        "artifact_id": artifact_id,
        "id": index,
        "evidence": _pair,
        "before": _endpoint(_pair["original_candidate_id"]),
        "after": _endpoint(_pair["modified_candidate_id"]),
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
