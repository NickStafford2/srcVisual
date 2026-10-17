from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import srcdiffvisual.bigmovebench.routes as routes_module
from srcdiffvisual.artifacts.models import PublishedArtifact
from srcdiffvisual.bigmovebench.bundles import publish_review_bundle, read_review_case
from srcdiffvisual.web.app import create_app


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
        "schema_version": 2,
        "ordinal": 1,
        "case_id": "case-one",
        "outcome": "srcmove_miss",
        "diagnosis": {"stage": "verification", "reason": "below_threshold"},
        "results": __import__('tests.schema3_fixtures', fromlist=['schema3_results']).schema3_results(),
    }
    _manifest = {
        "schema_version": 2,
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
    _build_arguments = []

    def _publish(**_kwargs):
        _build_arguments.append(_kwargs)
        return _published

    monkeypatch.setattr(
        routes_module, "build_visualization_artifact", _publish
    )
    monkeypatch.setattr(
        routes_module,
        "read_artifact_manifest",
        lambda **_kwargs: {
            "schema_version": 5,
            "projection_schema_version": 2,
            "artifact_id": "artifact-one",
        },
    )
    _visualize = _client.post(
        f"/api/bigmovebench/reviews/{_review_id}/cases/1/visualize"
    )
    assert _visualize.status_code == 200
    assert _visualize.get_json()["artifact_id"] == "artifact-one"
    assert (
        _build_arguments[0]["producer_move_results"]
        == _case_response.get_json()["results"]
    )


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


def _rewrite_bundle(*, receipt=None, results=None, result_evidence=None):
    _stream = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(_bundle())) as _source, zipfile.ZipFile(_stream, "w") as _destination:
        for _name in _source.namelist():
            _data = _source.read(_name)
            if _name == "manifest.json" and result_evidence is not None:
                _document = json.loads(_data)
                _document["cases"][0]["result_evidence"] = result_evidence
                _data = json.dumps(_document)
            elif _name.endswith("review.json") and receipt is not None:
                _document = json.loads(_data)
                _document["results"] = receipt
                _data = json.dumps(_document)
            elif _name.endswith("results.json") and results is not None:
                _data = json.dumps(results)
            _destination.writestr(_name, _data)
    return _stream.getvalue()


def test_augmented_receipt_is_inspected_intact_but_visualization_gets_strict_evidence(monkeypatch, tmp_path):
    from tests.schema3_fixtures import schema3_results
    _results = schema3_results()
    _receipt = {**_results, "_oracle_diagnostic_stage": "verification"}
    _payload = _rewrite_bundle(receipt=_receipt, results=_results,
                               result_evidence={"status": "admitted", "results_schema_version": 3})
    _app = create_app()
    _app.config["ARTIFACT_ROOT"] = tmp_path
    _client = _app.test_client()
    _import = _client.post("/api/bigmovebench/reviews", data={"review_bundle": (io.BytesIO(_payload), "review.zip")})
    assert _import.status_code == 201, _import.get_json()
    _review_id = _import.get_json()["review_id"]
    _inspect = _client.get(f"/api/bigmovebench/reviews/{_review_id}/cases/1")
    assert _inspect.get_json()["results"] == _receipt
    _calls = []
    monkeypatch.setattr(routes_module, "build_visualization_artifact", lambda **kwargs: (_calls.append(kwargs) or PublishedArtifact("artifact-one", tmp_path, {})))
    monkeypatch.setattr(routes_module, "read_artifact_manifest", lambda **kwargs: {"artifact_id": "artifact-one"})
    _visualize = _client.post(f"/api/bigmovebench/reviews/{_review_id}/cases/1/visualize")
    assert _visualize.status_code == 200, _visualize.get_json()
    assert _calls[0]["producer_move_results"] == _results
    assert "_oracle_diagnostic_stage" not in _calls[0]["producer_move_results"]


def test_failed_case_keeps_forensics_but_never_executes_visualization(monkeypatch, tmp_path):
    _forensic = {"results_schema_version": 2, "moves": [], "error": "producer failed"}
    _payload = _rewrite_bundle(receipt=_forensic, results=_forensic,
                               result_evidence={"status": "nonvisualizable", "error": "No admitted schema-3 output"})
    _app = create_app()
    _app.config["ARTIFACT_ROOT"] = tmp_path
    _client = _app.test_client()
    _import = _client.post("/api/bigmovebench/reviews", data={"review_bundle": (io.BytesIO(_payload), "failed.zip")})
    assert _import.status_code == 201, _import.get_json()
    _review_id = _import.get_json()["review_id"]
    assert _client.get(f"/api/bigmovebench/reviews/{_review_id}/cases/1").get_json()["results"] == _forensic
    def _unexpected(**kwargs):
        raise AssertionError("Nonvisualizable forensic results must not execute visualization or detection")
    monkeypatch.setattr(routes_module, "build_visualization_artifact", _unexpected)
    _visualize = _client.post(f"/api/bigmovebench/reviews/{_review_id}/cases/1/visualize")
    assert _visualize.status_code == 400
    assert "no admitted visualizable results" in _visualize.get_json()["error"]


def test_bundle_rejects_receipt_and_plain_evidence_disagreement(tmp_path):
    import pytest
    from tests.schema3_fixtures import schema3_results
    _results = schema3_results()
    _receipt = {**schema3_results(), "_oracle_diagnostic_stage": "verification"}
    _receipt["configuration"]["min_granularity"] = "fragment"
    with pytest.raises(ValueError, match="differs from results.json"):
        publish_review_bundle(artifact_root=tmp_path, payload=_rewrite_bundle(receipt=_receipt, results=_results))


def test_invalid_results_need_explicit_forensic_status(tmp_path):
    import pytest
    _invalid = {"error": "no producer output"}
    with pytest.raises(ValueError):
        publish_review_bundle(artifact_root=tmp_path, payload=_rewrite_bundle(receipt=_invalid, results=_invalid))
