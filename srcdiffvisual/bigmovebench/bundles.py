from __future__ import annotations

import hashlib
import json
import os
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from srcmove_runtime.results_schema import benchmark_result_evidence

from srcdiffvisual.srcmove.srcmove_results import (
    validate_classification_fields,
    validate_producer_results,
)


REQUIRED_CASE_FILES = {
    "expected_source": "expected-source.java",
    "expected_destination": "expected-destination.java",
    "srcdiff_xml": "srcdiff.xml",
    "srcmove_xml": "srcmove.xml",
    "results": "results.json",
    "review": "review.json",
}
MAX_EXPANDED_BYTES = 256 * 1024 * 1024


def publish_review_bundle(*, artifact_root: Path, payload: bytes) -> dict[str, Any]:
    _review_id = "bmb-review-sha256-" + hashlib.sha256(payload).hexdigest()
    _review_root = artifact_root / "bigmovebench-reviews"
    _final = _review_root / _review_id
    if _final.is_dir():
        return read_review_manifest(artifact_root=artifact_root, review_id=_review_id)

    _review_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".bmb-review-", dir=_review_root) as _name:
        _staging = Path(_name)
        _manifest = _extract_validated_bundle(payload, _staging)
        _stored = {
            **_manifest,
            "review_id": _review_id,
        }
        (_staging / "manifest.json").write_text(
            json.dumps(_stored, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        try:
            os.rename(_staging, _final)
        except FileExistsError:
            pass
    return read_review_manifest(artifact_root=artifact_root, review_id=_review_id)


def read_review_manifest(*, artifact_root: Path, review_id: str) -> dict[str, Any]:
    _directory = _review_directory(artifact_root, review_id)
    _manifest = _read_json(_directory / "manifest.json")
    if _manifest.get("review_id") != review_id:
        raise ValueError("BigMoveBench review identity does not match its directory.")
    _validate_manifest(_manifest)
    return _manifest


def read_review_case(
    *, artifact_root: Path, review_id: str, ordinal: int
) -> tuple[dict[str, Any], Path]:
    _manifest = read_review_manifest(artifact_root=artifact_root, review_id=review_id)
    _case = next(
        (_case for _case in _manifest["cases"] if _case["ordinal"] == ordinal),
        None,
    )
    if _case is None:
        raise ValueError(f"BigMoveBench review case does not exist: {ordinal}")
    _directory = _review_directory(artifact_root, review_id) / _case["directory"]
    _review = _read_json(_directory / _case["files"]["review"])
    return _review, _directory


def read_review_results(*, artifact_root: Path, review_id: str, ordinal: int) -> dict[str, Any]:
    """Return admitted evidence only; forensic cases remain inspectable."""
    _manifest = read_review_manifest(artifact_root=artifact_root, review_id=review_id)
    _case = next((_case for _case in _manifest["cases"] if _case["ordinal"] == ordinal), None)
    if _case is None:
        raise ValueError(f"BigMoveBench review case does not exist: {ordinal}")
    _status = _case.get("result_evidence", {"status": "admitted", "results_schema_version": 3})
    if _status["status"] == "nonvisualizable":
        raise ValueError("This review case has no admitted visualizable results: " + _status["error"])
    _review, _directory = read_review_case(artifact_root=artifact_root, review_id=review_id, ordinal=ordinal)
    _results = _read_json(_directory / _case["files"]["results"])
    _validate_case_results(_case, _review, _results)
    return _results


def _validate_case_results(case: dict[str, Any], review: dict[str, Any], results: dict[str, Any]) -> None:
    _status = case.get("result_evidence", {"status": "admitted", "results_schema_version": 3})
    if _status["status"] == "nonvisualizable":
        validate_classification_fields({_key: _value for _key, _value in review.items() if _key != "results"})
        if results != review.get("results"):
            raise ValueError("Forensic results.json differs from the retained review receipt.")
        try:
            benchmark_result_evidence(results)
        except ValueError:
            return
        raise ValueError("Nonvisualizable review case contains admitted schema-3 evidence.")
    validate_classification_fields(review)
    validate_producer_results(results)
    _evidence = benchmark_result_evidence(review.get("results"))
    if _evidence != results:
        raise ValueError("Review receipt evidence differs from results.json.")


def _review_directory(artifact_root: Path, review_id: str) -> Path:
    if not review_id.startswith("bmb-review-sha256-") or len(review_id) != 82:
        raise ValueError("Invalid BigMoveBench review identifier.")
    _directory = artifact_root / "bigmovebench-reviews" / review_id
    if not _directory.is_dir():
        raise ValueError("BigMoveBench review was not found.")
    return _directory


def _extract_validated_bundle(payload: bytes, staging: Path) -> dict[str, Any]:
    _zip_path = staging / "bundle.zip"
    _zip_path.write_bytes(payload)
    try:
        with zipfile.ZipFile(_zip_path) as _archive:
            _members = {_info.filename: _info for _info in _archive.infolist()}
            if "manifest.json" not in _members:
                raise ValueError("BigMoveBench review bundle has no manifest.json.")
            if sum(_info.file_size for _info in _members.values()) > MAX_EXPANDED_BYTES:
                raise ValueError("BigMoveBench review bundle expands beyond 256 MB.")
            _manifest = json.loads(_archive.read("manifest.json"))
            _validate_manifest(_manifest)
            for _case in _manifest["cases"]:
                _directory = PurePosixPath(_case["directory"])
                for _key, _filename in REQUIRED_CASE_FILES.items():
                    _member = (_directory / _filename).as_posix()
                    if _member not in _members:
                        raise ValueError(
                            f"BigMoveBench review file is missing: {_member}"
                        )
                    _destination = staging / _member
                    _destination.parent.mkdir(parents=True, exist_ok=True)
                    _destination.write_bytes(_archive.read(_member))
            for _case in _manifest["cases"]:
                _directory = staging / _case["directory"]
                _review = _read_json(_directory / "review.json")
                if _review.get("schema_version") != 2:
                    raise ValueError(
                        "Unsupported review case schema; export a new schema-2 bundle."
                    )
                _validate_case_results(_case, _review, _read_json(_directory / "results.json"))
            return _manifest
    except (zipfile.BadZipFile, json.JSONDecodeError) as _error:
        raise ValueError("Invalid BigMoveBench review bundle.") from _error


def _validate_manifest(manifest: Any) -> None:
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 2:
        raise ValueError(
            "Unsupported BigMoveBench review manifest. Preserve the old ZIP and export a new schema-2 review bundle."
        )
    validate_classification_fields(manifest)
    _cases = manifest.get("cases")
    if not isinstance(_cases, list) or manifest.get("case_count") != len(_cases):
        raise ValueError("BigMoveBench review case count is invalid.")
    _ordinals: set[int] = set()
    for _case in _cases:
        if not isinstance(_case, dict):
            raise ValueError("BigMoveBench review case entry is invalid.")
        _ordinal = _case.get("ordinal")
        _directory = _case.get("directory")
        if not isinstance(_ordinal, int) or _ordinal <= 0 or _ordinal in _ordinals:
            raise ValueError("BigMoveBench review case ordinal is invalid.")
        _ordinals.add(_ordinal)
        if _directory != f"cases/{_ordinal:04d}":
            raise ValueError("BigMoveBench review case directory is invalid.")
        if _case.get("files") != REQUIRED_CASE_FILES:
            raise ValueError("BigMoveBench review case file contract is invalid.")
        if not isinstance(_case.get("case_id"), str):
            raise ValueError("BigMoveBench review case identifier is invalid.")
        _status = _case.get("result_evidence")
        if _status is not None:
            if not isinstance(_status, dict):
                raise ValueError("Invalid BigMoveBench result evidence status.")
            if _status.get("status") == "admitted":
                if _status != {"status": "admitted", "results_schema_version": 3}:
                    raise ValueError("Invalid admitted BigMoveBench result evidence version.")
            elif _status.get("status") == "nonvisualizable":
                if set(_status) != {"status", "error"} or not isinstance(_status["error"], str) or not _status["error"]:
                    raise ValueError("Nonvisualizable BigMoveBench case requires an error.")
            else:
                raise ValueError("Unsupported BigMoveBench result evidence status.")
        if not isinstance(_case.get("diagnosis"), dict):
            raise ValueError("BigMoveBench review diagnosis is invalid.")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        _value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as _error:
        raise ValueError(f"Invalid BigMoveBench review file: {path.name}") from _error
    if not isinstance(_value, dict):
        raise ValueError(f"BigMoveBench review file is not an object: {path.name}")
    return _value
