from srcdiffvisual.workflow._correspondence_locations import (
    add_correspondence_locations,
)


def test_ambiguous_xpath_and_text_mismatch_are_not_highlighted() -> None:
    _xml = """<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" filename="a.cpp"><diff:delete><decl><name>x</name></decl><decl><name>x</name></decl></diff:delete></unit>"""
    from tests.schema3_fixtures import schema3_results
    _results = schema3_results()
    _results['diagnostics'] = {
        'schema_version': 5, 'candidate_counts': {'registered': 3, 'active': 3},
        'candidates': [
            {'candidate_id': number, 'revision': 'original', 'role': 'diff_wrapper',
             'selected_group_id': None, 'type3_eligible': False, 'line_units': 1, 'token_units': 1,
             'endpoint': {'candidate_id': number, 'revision_file': 'a.cpp', 'construct': 'decl',
                          'xpath': path, 'raw_text': text}}
            for number, path, text in [
                (0, "/src:unit[1]/diff:delete[1]/src:decl[src:name='x']", 'x'),
                (1, '/src:unit[1]/diff:delete[1]/src:decl[1]', 'wrong'),
                (2, '/src:unit[1]/diff:delete[1]/src:decl[2]', 'x')]],
        'correspondences': [], 'type3_comparisons': [], 'type2b_groups': []}
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
