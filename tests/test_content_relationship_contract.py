from copy import deepcopy

import pytest

from srcdiffvisual.srcmove.srcmove_results import (
    validate_classification_fields,
    validate_producer_results,
)


def _results():
    return {
        "results_schema_version": 2,
        "moves": [{"move_id": "one", "content_relationship": "type3"}],
        "content_relationships": {"type1": 0, "type2c": 0, "type3": 1},
        "_oracle_observed_content_relationship": "type3",
        "_oracle_label_correction": {"reviewed_content_relationship": "type2b"},
        "diagnostics": {
            "schema_version": 4,
            "correspondences": [{"correspondence_kind": "type2b"}],
        },
    }


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
    _value["_oracle_label_correction"][field] = "type2"
    with pytest.raises(ValueError, match="legacy classification field"):
        validate_producer_results(_value)


@pytest.mark.parametrize("relationship", ["type2", "type2b", "unknown", None])
def test_detector_cannot_predict_legacy_or_benchmark_only_types(relationship):
    _value = _results()
    _value["moves"][0]["content_relationship"] = relationship
    with pytest.raises(ValueError):
        validate_producer_results(_value)


@pytest.mark.parametrize("field", ["results_schema_version", "content_relationships"])
def test_required_producer_fields_cannot_be_dropped(field):
    _value = _results()
    del _value[field]
    with pytest.raises(ValueError):
        validate_producer_results(_value)


def test_summary_counts_groups_and_does_not_silently_discard_labels():
    _value = _results()
    _value["content_relationships"]["type3"] = 0
    with pytest.raises(ValueError, match="count all reported groups"):
        validate_producer_results(_value)
    with pytest.raises(ValueError, match="Unsupported content relationship"):
        validate_classification_fields({"expected_content_relationship": "type2"})
