from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import srcvisual.bigmovebench.routes as routes_module
from srcvisual.artifacts.models import PublishedArtifact
from srcvisual.bigmovebench.bundles import publish_review_bundle, read_review_case
from srcvisual.web.app import create_app


def _bundle() -> bytes:
    _files = {
        "expected_source": "expected-source.java",
        "expected_destination": "expected-destination.java",
        "srcdiff_xml": "srcdiff.xml",
        "srcmove_xml": "srcmove.xml",
        "results": "results.json",
        "review": "review.json",
    }
    _review = {
        "schema_version": 1,
        "ordinal": 1,
        "case_id": "case-one",
        "outcome": "srcmove_miss",
        "diagnosis": {"stage": "verification", "reason": "below_threshold"},
        "results": {"move_count": 0, "moves": [], "diagnostics": {}},
    }
    _manifest = {
        "schema_version": 1,
        "case_count": 1,
        "cases": [
            {
                "ordinal": 1,
                "case_id": "case-one",
                "outcome": "srcmove_miss",
                "strength_stratum": "strong",
                "type3_both_similarity": 0.82,
                "diagnosis": _review["diagnosis"],
                "directory": "cases/0001",
                "files": _files,
            }
        ],
    }
    _stream = io.BytesIO()
    with zipfile.ZipFile(_stream, "w") as _archive:
        _archive.writestr("manifest.json", json.dumps(_manifest))
        _archive.writestr("cases/0001/expected-source.java", "void before() {}")
        _archive.writestr(
            "cases/0001/expected-destination.java", "void after() {}"
        )
        _archive.writestr("cases/0001/srcdiff.xml", "<unit/>")
        _archive.writestr("cases/0001/srcmove.xml", "<unit/>")
        _archive.writestr("cases/0001/results.json", json.dumps(_review["results"]))
        _archive.writestr("cases/0001/review.json", json.dumps(_review))
    return _stream.getvalue()


def test_bundle_is_content_addressed_and_case_is_readable(tmp_path: Path) -> None:
    _first = publish_review_bundle(artifact_root=tmp_path, payload=_bundle())
    _second = publish_review_bundle(artifact_root=tmp_path, payload=_bundle())

    assert _first == _second
    assert _first["case_count"] == 1
    _review, _directory = read_review_case(
        artifact_root=tmp_path,
        review_id=_first["review_id"],
        ordinal=1,
    )
    assert _review["diagnosis"]["reason"] == "below_threshold"
    assert (_directory / "srcdiff.xml").read_text(encoding="utf-8") == "<unit/>"


def test_review_routes_import_inspect_and_visualize(
    monkeypatch, tmp_path: Path
) -> None:
    _app = create_app()
    _app.config["ARTIFACT_ROOT"] = tmp_path
    _client = _app.test_client()
    _response = _client.post(
        "/api/bigmovebench/reviews",
        data={"review_bundle": (io.BytesIO(_bundle()), "type3-review.zip")},
    )
    assert _response.status_code == 201
    _manifest = _response.get_json()
    _review_id = _manifest["review_id"]

    _case_response = _client.get(
        f"/api/bigmovebench/reviews/{_review_id}/cases/1"
    )
    assert _case_response.status_code == 200
    assert _case_response.get_json()["case_id"] == "case-one"

    _published = PublishedArtifact("artifact-one", tmp_path, {})
    monkeypatch.setattr(
        routes_module, "build_visualization_artifact", lambda **_kwargs: _published
    )
    monkeypatch.setattr(
        routes_module,
        "read_artifact_manifest",
        lambda **_kwargs: {
            "schema_version": 2,
            "projection_schema_version": 1,
            "artifact_id": "artifact-one",
        },
    )
    _visualize = _client.post(
        f"/api/bigmovebench/reviews/{_review_id}/cases/1/visualize"
    )
    assert _visualize.status_code == 200
    assert _visualize.get_json()["artifact_id"] == "artifact-one"


def test_invalid_bundle_is_rejected_without_publication(tmp_path: Path) -> None:
    _stream = io.BytesIO()
    with zipfile.ZipFile(_stream, "w") as _archive:
        _archive.writestr("manifest.json", "{}")

    try:
        publish_review_bundle(artifact_root=tmp_path, payload=_stream.getvalue())
    except ValueError as _error:
        assert "Unsupported" in str(_error)
    else:
        raise AssertionError("invalid review bundle was accepted")
    assert not list((tmp_path / "bigmovebench-reviews").glob("bmb-review-*"))
