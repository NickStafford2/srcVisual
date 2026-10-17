from copy import deepcopy

import pytest

from srcdiffvisual.srcmove.srcmove_results import (
    validate_classification_fields,
    validate_producer_results,
)


def _results():
    from tests.schema3_fixtures import schema3_results
    return schema3_results([{'move_id': 'one', 'content_relationship': 'type3',
                            'from_xpaths': ['/src:unit[1]/diff:delete[1]'],
                            'to_xpaths': ['/src:unit[1]/diff:insert[1]'],
                            'from_raw_texts': ['before();'], 'to_raw_texts': ['after();']}])


def test_predictions_expectations_and_diagnostics_remain_distinct():
    _value = _results()
    _before = deepcopy(_value)
    validate_producer_results(_value)
    assert _value == _before


@pytest.mark.parametrize(
    "field",
    [
        "match_kind",
        "match_kinds",
        "by_match_type",
        "reviewed_match_kind",
        "_oracle_observed_match_kind",
    ],
)
def test_nested_legacy_fields_are_rejected(field):
    _value = _results()
    _label = {"reviewed_content_relationship": "type2b", field: "type2"}
    with pytest.raises(ValueError, match="legacy classification field"):
        validate_classification_fields({"_oracle_label_correction": _label})
    _value[field] = "type2"
    with pytest.raises(ValueError):
        validate_producer_results(_value)


@pytest.mark.parametrize("relationship", ["type2", "type2b", "unknown", None])
def test_detector_cannot_predict_legacy_or_benchmark_only_types(relationship):
    _value = _results()
    _value["atomic_move_groups"][0]["content_relationship"] = relationship
    with pytest.raises(ValueError):
        validate_producer_results(_value)


@pytest.mark.parametrize("field", ["results_schema_version", "summary"])
def test_required_producer_fields_cannot_be_dropped(field):
    _value = _results()
    del _value[field]
    with pytest.raises(ValueError):
        validate_producer_results(_value)


def test_summary_counts_groups_and_does_not_silently_discard_labels():
    _value = _results()
    _value["summary"]["atomic_content_relationships"]["type3"] = 0
    with pytest.raises(ValueError, match="Summary"):
        validate_producer_results(_value)
    with pytest.raises(ValueError, match="Unsupported content relationship"):
        validate_classification_fields({"expected_content_relationship": "type2"})


def test_raw_producer_cannot_supply_viewer_owned_location_sidecar():
    _value = _results()
    _value["visualization_candidate_locations"] = {"0": {"unit_id": 1}}
    with pytest.raises(ValueError, match="unknown property"):
        validate_producer_results(_value)
    validate_producer_results(_value, allow_visualization_metadata=True)


def test_supplied_producer_sidecar_rejected_before_source_processing(tmp_path):
    from srcdiffvisual.workflow.payload import build_visualization_artifact
    _value = _results()
    _value["visualization_candidate_locations"] = {"0": {"unit_id": 1}}
    with pytest.raises(ValueError, match="unknown property"):
        build_visualization_artifact(
            filename="input.xml", payload=b"<unit />", artifact_root=tmp_path,
            producer_move_results=_value,
        )
