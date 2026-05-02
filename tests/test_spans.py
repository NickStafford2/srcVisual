import xml.etree.ElementTree as ET

from srcvisual.core.namespaces import POS_END, POS_START
from srcvisual.core.spans import (
    build_xml_span_index,
    parse_position_point,
    parse_position_points,
    parse_position_spans,
)


def test_parse_position_point() -> None:
    assert parse_position_point("12:34") == (12, 34)


def test_parse_position_points() -> None:
    assert parse_position_points("1:2|3:4") == ((1, 2), (3, 4))


def test_parse_position_spans_returns_none_when_position_data_missing() -> None:
    element = ET.Element("name")

    assert parse_position_spans(element) is None


def test_parse_position_spans_returns_none_when_position_data_is_invalid() -> None:
    element = ET.Element(
        "name",
        {
            POS_START: "1:2",
            POS_END: "not-a-position",
        },
    )

    assert parse_position_spans(element) is None


def test_parse_position_spans_returns_none_when_start_and_end_counts_differ() -> None:
    element = ET.Element(
        "name",
        {
            POS_START: "1:2|3:4",
            POS_END: "5:6",
        },
    )

    assert parse_position_spans(element) is None


def test_parse_position_spans_parses_single_span() -> None:
    element = ET.Element(
        "name",
        {
            POS_START: "1:2",
            POS_END: "3:4",
        },
    )

    spans = parse_position_spans(element)

    assert spans is not None
    assert len(spans) == 1
    assert spans[0].start_line == 1
    assert spans[0].start_col == 2
    assert spans[0].end_line == 3
    assert spans[0].end_col == 4


def test_parse_position_spans_parses_multiple_spans() -> None:
    element = ET.Element(
        "name",
        {
            POS_START: "1:2|5:6",
            POS_END: "3:4|7:8",
        },
    )

    spans = parse_position_spans(element)

    assert spans is not None
    assert len(spans) == 2

    assert spans[0].start_line == 1
    assert spans[0].start_col == 2
    assert spans[0].end_line == 3
    assert spans[0].end_col == 4

    assert spans[1].start_line == 5
    assert spans[1].start_col == 6
    assert spans[1].end_line == 7
    assert spans[1].end_col == 8


def test_build_xml_span_index_uses_srcdiff_unit_paths() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src">
  <unit filename="revision-0.cpp">
    <function>
      <name>main</name>
    </function>
  </unit>
  <unit filename="revision-1.cpp">
    <function>
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    spans = build_xml_span_index(xml)

    assert "/src:unit[1]" in spans
    assert "/src:unit[1]/function[1]" in spans
    assert "/src:unit[1]/function[1]/name[1]" in spans

    assert "/src:unit[2]" in spans
    assert "/src:unit[2]/function[1]" in spans
    assert "/src:unit[2]/function[1]/name[1]" in spans


def test_build_xml_span_index_skips_diff_ws_by_default() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff">
  <unit filename="example.cpp">
    <function>
      <diff:ws> </diff:ws>
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    spans = build_xml_span_index(xml)

    assert "/src:unit[1]/function[1]/diff:ws[1]" not in spans
    assert "/src:unit[1]/function[1]/name[1]" in spans


def test_build_xml_span_index_can_include_skipped_tags() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff">
  <unit filename="example.cpp">
    <function>
      <diff:ws> </diff:ws>
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    spans = build_xml_span_index(xml, include_skipped_tags=True)

    assert "/src:unit[1]/function[1]/diff:ws[1]" in spans
    assert "/src:unit[1]/function[1]/name[1]" in spans
