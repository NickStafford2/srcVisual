"""Independent locator remapping checks, including srcReader predicate positions."""
from copy import deepcopy

import pytest
from lxml import etree

from srcdiffvisual.srcmove.retained_annotations import annotate_retained_results
from srcdiffvisual.srcmove.srcmove_results import (
    build_filename_to_unit_index, normalize_srcmove_xpath, parse_srcmove_result_moves,
)
from tests.schema3_fixtures import schema3_results

SRC = "http://www.srcML.org/srcML/src"
DIFF = "http://www.srcML.org/srcDiff"


def _xml(archive):
    _file = f'<unit xmlns="{SRC}" xmlns:diff="{DIFF}" filename="a.cpp|b.cpp"><diff:delete><function><name>f</name><expr_stmt>a();</expr_stmt></function></diff:delete><diff:insert><function><name>f</name><expr_stmt>a();</expr_stmt></function></diff:insert></unit>'
    return f'<unit xmlns="{SRC}" url="">{_file}</unit>' if archive else _file


@pytest.mark.parametrize("archive", [False, True])
def test_predicate_positions_resolve_and_annotations_preserve_native_links(archive):
    _xml_text = _xml(archive)
    _prefix = "/src:unit[@filename='a.cpp|b.cpp'][1]" if archive else "/src:unit[1]"
    _old = _prefix + "/diff:delete[1]/src:function[src:name='f'][1]/src:expr_stmt[1]"
    _new = _prefix + "/diff:insert[1]/src:function[src:name='f'][1]/src:expr_stmt[1]"
    _results = schema3_results([{"move_id": "0", "content_relationship": "type1", "from_xpaths": [_old], "to_xpaths": [_new], "from_raw_texts": ["a();"], "to_raw_texts": ["a();"]}])
    _before = deepcopy(_results)
    _annotated = annotate_retained_results(_xml_text, _results)
    assert _results == _before
    _root = etree.fromstring(_annotated.encode())
    _to = _root.xpath('//@*[local-name()="to" and namespace-uri()="http://www.srcML.org/srcMove"]')
    assert _to == [_new]
    _parsed = parse_srcmove_result_moves(_results, filename_to_unit_index=build_filename_to_unit_index(_annotated))
    assert _parsed[0].from_xpaths == ("/src:unit[1]/diff:delete[1]/function[1]/expr_stmt[1]",)


def test_archive_omission_is_not_guessed_for_child_units_without_url():
    _xml_text = _xml(True).replace(' url=""', '')
    _index = build_filename_to_unit_index(_xml_text)
    with pytest.raises(ValueError, match="exactly once"):
        normalize_srcmove_xpath("/src:unit[@filename='a.cpp|b.cpp'][1]/diff:delete[1]", filename_to_unit_index=_index)


def test_producer_namespace_context_wins_over_earlier_unselected_rebinding():
    _xml_text = f'<unit xmlns="{SRC}" xmlns:diff="{DIFF}" url="archive"><unit xmlns:ext="urn:unselected" filename="unused.cpp"><ext:x/></unit><unit xmlns:ext="urn:retained" filename="selected.cpp"><diff:delete><ext:x>a();</ext:x></diff:delete><diff:insert><ext:x>a();</ext:x></diff:insert></unit></unit>'
    _results = schema3_results([{"move_id": "m", "content_relationship": "type1", "from_xpaths": ["/src:unit[@filename='selected.cpp'][1]/diff:delete[1]/ext:x[1]"], "to_xpaths": ["/src:unit[@filename='selected.cpp'][1]/diff:insert[1]/ext:x[1]"], "from_raw_texts": ["a();"], "to_raw_texts": ["a();"]}])
    _results["xpath_context"]["namespaces"]["ext"] = "urn:retained"
    _parsed = parse_srcmove_result_moves(_results, filename_to_unit_index=build_filename_to_unit_index(_xml_text))
    assert _parsed[0].from_xpaths[0].startswith("/src:unit[2]/diff:delete[1]/")


def test_unqualified_xml_namespace_rebinding_is_rejected_instead_of_guessed():
    _xml_text = f'<unit xmlns="{SRC}" url="archive"><unit xmlns:ext="urn:a" filename="a"><ext:x/></unit><unit xmlns:ext="urn:b" filename="b"><ext:x/></unit></unit>'
    with pytest.raises(ValueError, match="ambiguous XML locator namespace"):
        normalize_srcmove_xpath("/src:unit[2]/ext:x[1]", filename_to_unit_index=build_filename_to_unit_index(_xml_text))


@pytest.mark.parametrize("mutation", ["intervening", "reversed", "wrong_parent"])
def test_retained_sequence_checks_actual_xml_structure(mutation):
    _xml_text = f'<unit xmlns="{SRC}" xmlns:diff="{DIFF}" filename="a.cpp|b.cpp"><diff:delete><expr_stmt>a();</expr_stmt><expr_stmt>b();</expr_stmt></diff:delete><diff:insert><expr_stmt>a();</expr_stmt><expr_stmt>b();</expr_stmt></diff:insert></unit>'
    _moves = [{"move_id": _name, "content_relationship": "type1",
               "from_xpaths": [f"/src:unit[1]/diff:delete[1]/src:expr_stmt[{_number}]"],
               "to_xpaths": [f"/src:unit[1]/diff:insert[1]/src:expr_stmt[{_number}]"],
               "from_raw_texts": [f"{_name}();"], "to_raw_texts": [f"{_name}();"]}
              for _number, _name in enumerate(("a", "b"), 1)]
    _results = schema3_results(_moves, sequence=True)
    for _side, _filename in (("original", "a.cpp"), ("modified", "b.cpp")):
        _span = _results["output_items"][0]["sequence"][_side]
        _span.update(revision_file=_filename, parent_id=f"a.cpp|b.cpp:{_side}:unit:0")
        for _group in _results["atomic_move_groups"]:
            _group[_side][0]["revision_file"] = _filename
    assert annotate_retained_results(_xml_text, _results)
    if mutation == "intervening":
        _xml_text = _xml_text.replace('</expr_stmt><expr_stmt>b();', '</expr_stmt><decl_stmt>int gap;</decl_stmt><expr_stmt>b();', 1)
    elif mutation == "reversed":
        _results["output_items"][0]["member_group_ids"].reverse()
        _results["output_items"][0]["id"] = "sequence:b"
    else:
        _results["output_items"][0]["sequence"]["original"]["parent_id"] = "invented-parent"
    with pytest.raises(ValueError, match="child positions|parent ID"):
        annotate_retained_results(_xml_text, _results)
