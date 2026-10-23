import json
from unittest.mock import Mock

from srcdiffvisual.artifacts import report
from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.store import publish_artifact
from srcdiffvisual.web.app import create_app
from tests.artifacts.test_projections import _publish_fixture, _diagnostic_fixture
from tests.artifacts.test_store import build_payload


def test_retained_report_includes_diagnostics_and_download_is_complete(tmp_path, monkeypatch):
    _artifact = _publish_fixture(tmp_path, diagnostics=_diagnostic_fixture())
    monkeypatch.setenv("SRCDIFFVISUAL_ARTIFACT_ROOT", str(tmp_path))
    _client = create_app().test_client()
    _url = f"/api/artifacts/{_artifact.artifact_id}/report"
    _response = _client.get(_url)
    assert _response.status_code == 200
    _preview = _response.get_json()
    assert _preview["available"] and _preview["diagnostics_available"]
    assert not _preview["truncated"]
    _document = json.loads(_preview["text"])
    assert _document["results_schema_version"] == 3
    assert _document["diagnostics"] == _diagnostic_fixture()
    assert "producer_metadata" not in _document
    _download = _client.get(_url + "/download")
    assert _download.status_code == 200
    assert _download.mimetype == "application/json"
    assert _download.headers["Content-Disposition"] == 'attachment; filename="results.json"'
    assert json.loads(_download.data) == _document

    monkeypatch.setattr(report, "MAX_PREVIEW_CHARACTERS", 32)
    _short = _client.get(_url).get_json()
    assert _short["truncated"] and len(_short["text"]) == 32
    assert json.loads(_client.get(_url + "/download").data) == _document


def test_results_without_diagnostics_remain_available(tmp_path):
    _artifact = _publish_fixture(tmp_path)
    _preview = report.read_report_projection(artifact_root=tmp_path, artifact_id=_artifact.artifact_id)
    assert _preview["available"]
    assert not _preview["diagnostics_available"]
    assert "diagnostics" not in json.loads(_preview["text"])


def test_xml_only_artifact_does_not_fabricate_report(tmp_path, monkeypatch):
    _artifact = publish_artifact(
        artifact_root=tmp_path, canonical_payload=build_payload(), input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )
    monkeypatch.setenv("SRCDIFFVISUAL_ARTIFACT_ROOT", str(tmp_path))
    _client = create_app().test_client()
    _url = f"/api/artifacts/{_artifact.artifact_id}/report"
    _preview = _client.get(_url).get_json()
    assert not _preview["available"] and not _preview["diagnostics_available"]
    assert _preview["text"] == ""
    assert _client.get(_url + "/download").status_code == 404


def test_report_excludes_viewer_added_metadata(tmp_path, monkeypatch):
    _artifact = _publish_fixture(tmp_path)
    # The report reader can inspect retained data independently of a full payload.
    _producer = report.read_report_document(artifact_root=tmp_path, artifact_id=_artifact.artifact_id)
    _producer["visualization_candidate_locations"] = {"internal": True}
    _connection = Mock()
    _connection.execute.return_value.fetchone.return_value = (json.dumps({"producer_metadata": _producer}),)
    monkeypatch.setattr(report, "_connect_readonly", lambda _path: _connection)
    _document = report.read_report_document(artifact_root=tmp_path, artifact_id=_artifact.artifact_id)
    assert "visualization_candidate_locations" not in _document
