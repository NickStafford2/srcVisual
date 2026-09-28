from srcdiffvisual.workflow._correspondence_locations import (
    add_correspondence_locations,
)


def test_ambiguous_xpath_and_text_mismatch_are_not_highlighted() -> None:
    _xml = """<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" filename="a.cpp"><diff:delete><decl><name>x</name></decl><decl><name>x</name></decl></diff:delete></unit>"""
    _results = {
        "diagnostics": {
            "schema_version": 4,
            "candidates": [
                {
                    "candidate_id": 0,
                    "side": "delete",
                    "xpath": "/src:unit[1]/diff:delete[1]/src:decl[src:name='x']",
                    "raw_text": "x",
                },
                {
                    "candidate_id": 1,
                    "side": "delete",
                    "xpath": "/src:unit[1]/diff:delete[1]/src:decl[1]",
                    "raw_text": "wrong",
                },
                {
                    "candidate_id": 2,
                    "side": "delete",
                    "xpath": "/src:unit[1]/diff:delete[1]/src:decl[2]",
                    "raw_text": "x",
                },
            ],
        }
    }
    add_correspondence_locations(_xml, _xml, _results)
    _locations = _results["visualization_candidate_locations"]
    assert _locations["0"]["span"] is None
    assert _locations["1"]["span"] is None
    assert _locations["2"]["span"] == {
        "start_line": 1,
        "start_col": 2,
        "end_line": 1,
        "end_col": 2,
    }
    add_correspondence_locations(_xml, _xml.replace(">x<", ">y<"), _results)
    assert _results["visualization_candidate_locations"]["2"]["span"] is None
