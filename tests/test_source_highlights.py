from srcvisual.core.source_highlights import build_move_source_highlights


def test_build_move_source_highlights_returns_canonical_move_endpoints() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <function mv:id="move-1" pos:start="1:1|20:1" pos:end="5:1|24:1">
      <diff:delete mv:id="move-1" pos:start="1:1" pos:end="5:1" />
      <diff:insert mv:id="move-1" pos:start="20:1" pos:end="24:1" />
    </function>
  </unit>
</unit>
"""

    highlights = build_move_source_highlights(xml)

    assert [highlight.path for highlight in highlights] == [
        "/src:unit[1]/function[1]/diff:delete[1]",
        "/src:unit[1]/function[1]/diff:insert[1]",
    ]
    assert [highlight.revision for highlight in highlights] == [
        "revision_0",
        "revision_1",
    ]
    assert [highlight.move_id for highlight in highlights] == ["move-1", "move-1"]
    assert [highlight.unit_id for highlight in highlights] == [1, 1]


def test_build_move_source_highlights_merges_child_positions_when_endpoint_has_none() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <diff:delete mv:id="move-1">
      <name pos:start="3:2" pos:end="3:6">main</name>
    </diff:delete>
  </unit>
</unit>
"""

    highlights = build_move_source_highlights(xml)

    assert len(highlights) == 1
    assert highlights[0].span.to_dict() == {
        "start_line": 3,
        "start_col": 2,
        "end_line": 3,
        "end_col": 6,
    }


def test_build_move_source_highlights_skips_diff_ws_when_merging_child_positions() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <diff:insert mv:id="move-1">
      <diff:ws> </diff:ws>
      <name pos:start="8:3" pos:end="8:7">main</name>
    </diff:insert>
  </unit>
</unit>
"""

    highlights = build_move_source_highlights(xml)

    assert len(highlights) == 1
    assert highlights[0].span.to_dict() == {
        "start_line": 8,
        "start_col": 3,
        "end_line": 8,
        "end_col": 7,
    }
