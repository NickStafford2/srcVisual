import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from srcdiffvisual.bigmovebench import browser_routes
from srcdiffvisual.core.namespaces import MV_NS
from srcdiffvisual.srcmove.existing_annotations import build_move_results_from_moved_srcdiff
from srcdiffvisual.srcmove.retained_annotations import annotate_retained_results
from srcdiffvisual.web.app import create_app


def _source(archive, zero):
    _xml = (Path(__file__).parents[2] / "examples/e2e_custom_pre_marked_move_small.xml").read_text()
    if archive:
        _xml = _xml[_xml.index("<unit"):]
        _xml = f'<unit xmlns="http://www.srcML.org/srcML/src" url="/tmp/original|/tmp/modified">{_xml}</unit>'
    _results = build_move_results_from_moved_srcdiff(moved_srcdiff_xml=_xml, include_skipped_tags=True)
    for _move in _results["moves"]:
        _move["content_relationship"] = "type2c"
    _root = ET.fromstring(_xml)
    for _element in _root.iter():
        for _key in list(_element.attrib):
            if _key.startswith("{" + MV_NS + "}") or _key == "move":
                del _element.attrib[_key]
    if zero:
        _results = {"move_count": 0, "moves": []}
    _results["results_schema_version"] = 2
    _results["content_relationships"] = {"type1": 0, "type2c": 0 if zero else len(_results["moves"]), "type3": 0}
    return {"schema_version": 2, "srcdiff_xml": ET.tostring(_root, encoding="unicode"),
            "results": _results, "case": {"category": "type2c", "ordinal": 1, "attempt_id": "retained-attempt", "outcome": "srcmove_miss" if zero else "oracle_pass"},
            "tool_sha256": {"srcdiff": "d" * 64, "srcmove": "e" * 64}}


@pytest.mark.parametrize("archive", [False, True])
@pytest.mark.parametrize("zero", [False, True])
def test_saved_case_opens_canonical_artifact_without_detector(monkeypatch, tmp_path, archive, zero):
    _source_record = _source(archive, zero)
    monkeypatch.setenv("SRCDIFFVISUAL_ARTIFACT_ROOT", str(tmp_path))
    monkeypatch.setattr(browser_routes, "read_benchmark", lambda *_args: _source_record)

    def _unexpected(**_kwargs):
        pytest.fail("Saved benchmark visualization must not execute a detector.")

    monkeypatch.setattr("srcdiffvisual.workflow._srcdiff.run_srcmove", _unexpected)
    monkeypatch.setattr("srcdiffvisual.workflow._srcdiff.run_srcdiff_with_positions", _unexpected)
    _client = create_app().test_client()
    _response = _client.post("/api/bigmovebench/runs/saved/cases/type2c/case-one/visualize")
    assert _response.status_code == 200, _response.get_json()
    _artifact = _response.get_json()
    assert _artifact["moves"]["move_count"] == (0 if zero else 1)
    if not zero:
        assert _artifact["moves"]["items"][0]["content_relationship"] == "type2c"
    assert _artifact["provenance"]["benchmark_case"]["attempt_id"] == "retained-attempt"
    assert _artifact["tools"]["identity_status"] == "recorded-benchmark-binaries"
    assert _artifact["tools"]["srcmove_sha256"] == "e" * 64
    _xml_response = _client.get(f"/api/artifacts/{_artifact['artifact_id']}/xml")
    assert _xml_response.status_code == 200
    assert "/tmp/original" not in _xml_response.get_data(as_text=True)


def test_replay_rejects_mismatched_text_and_missing_paths():
    _source_record = _source(False, False)
    _source_record["results"]["moves"][0]["from_raw_texts"][0] = "wrong text"
    with pytest.raises(ValueError, match="text differs"):
        annotate_retained_results(_source_record["srcdiff_xml"], _source_record["results"])
    _source_record["results"]["moves"][0]["from_xpaths"][0] = "/src:unit[99]/function[1]"
    with pytest.raises(ValueError, match="no file unit"):
        annotate_retained_results(_source_record["srcdiff_xml"], _source_record["results"])


def test_unavailable_source_returns_explicit_error(monkeypatch):
    def _unavailable(*_args):
        raise ValueError("Source view requires retained srcDiff input and completed srcMove results.")
    monkeypatch.setattr(browser_routes, "read_benchmark", _unavailable)
    _response = create_app().test_client().post("/api/bigmovebench/runs/saved/cases/type1/missing/visualize")
    assert _response.status_code == 400
    assert "completed srcMove results" in _response.get_json()["error"]
