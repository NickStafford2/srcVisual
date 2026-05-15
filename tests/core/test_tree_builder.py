from srcvisual.annotated_srcdiff.tree_builder import build_tree_index


def test_build_tree_index_keys_trees_by_unit_number() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src">
  <unit filename="first.cpp">
    <function>
      <name>first</name>
    </function>
  </unit>
  <unit filename="second.cpp">
    <function>
      <name>second</name>
    </function>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    assert set(tree_by_unit) == {1, 2}
    assert has_position_data is False

    assert tree_by_unit[1]["id"] == "/src:unit[1]"
    assert tree_by_unit[1]["label"] == "unit: first.cpp"

    assert tree_by_unit[2]["id"] == "/src:unit[2]"
    assert tree_by_unit[2]["label"] == "unit: second.cpp"


def test_build_tree_index_accepts_single_root_file_unit() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src" filename="basic.cpp">
  <function>
    <name>main</name>
  </function>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    assert set(tree_by_unit) == {1}
    assert has_position_data is False
    assert tree_by_unit[1]["id"] == "/src:unit[1]"
    assert tree_by_unit[1]["label"] == "unit: basic.cpp"
    assert tree_by_unit[1]["children"][0]["path"] == "/src:unit[1]/function[1]"


def test_build_tree_index_accepts_pos_tabs_on_unit() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp" pos:tabs="4">
    <function>
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    assert set(tree_by_unit) == {1}
    assert tree_by_unit[1]["label"] == "unit: example.cpp"
    assert has_position_data is False


def test_build_tree_index_accepts_type_attribute_on_diff_nodes() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff">
  <unit filename="example.cpp">
    <diff:delete type="move">
      <name>main</name>
    </diff:delete>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    delete_node = tree_by_unit[1]["children"][0]

    assert delete_node["kind"] == "delete"
    assert delete_node["srcdiff_attributes"]["diff"] == {
        "revision": None,
        "type": "move",
    }
    assert has_position_data is False


def test_build_tree_index_detects_move_nodes_from_srcmove_id() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:mv="http://www.srcML.org/srcMove">
  <unit filename="example.cpp">
    <function mv:id="move-1">
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    tree_by_unit, _ = build_tree_index(xml)

    unit = tree_by_unit[1]
    function = unit["children"][0]

    assert function["kind"] == "move"
    assert function["move_id"] == "move-1"


def test_build_tree_index_detects_move_nodes_from_plain_move_attribute() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src">
  <unit filename="example.cpp">
    <function move="move-1">
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    tree_by_unit, _ = build_tree_index(xml)

    unit = tree_by_unit[1]
    function = unit["children"][0]

    assert function["kind"] == "move"
    assert function["move_id"] == "move-1"


def test_build_tree_index_maps_delete_span_to_revision_0_span_only() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <diff:delete pos:start="10:2" pos:end="10:8">
      <name>oldName</name>
    </diff:delete>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    unit = tree_by_unit[1]
    delete_node = unit["children"][0]

    assert has_position_data is True
    assert delete_node["kind"] == "delete"
    assert delete_node["revision_0_span"] == {
        "start_line": 10,
        "start_col": 2,
        "end_line": 10,
        "end_col": 8,
    }
    assert delete_node["revision_1_span"] is None


def test_build_tree_index_maps_insert_span_to_revision_1_span_only() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <diff:insert pos:start="12:4" pos:end="12:12">
      <name>newName</name>
    </diff:insert>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    unit = tree_by_unit[1]
    insert_node = unit["children"][0]

    assert has_position_data is True
    assert insert_node["kind"] == "insert"
    assert insert_node["revision_0_span"] is None
    assert insert_node["revision_1_span"] == {
        "start_line": 12,
        "start_col": 4,
        "end_line": 12,
        "end_col": 12,
    }


def test_build_tree_index_does_not_merge_revision_1_into_delete_nodes() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="main.cpp">
    <diff:delete mv:id="move-1" pos:start="1:1" pos:end="5:1">
      <function pos:start="1:1|20:1" pos:end="5:1|24:1">
        <name>changed_function</name>
      </function>
    </diff:delete>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    delete_node = tree_by_unit[1]["children"][0]

    assert has_position_data is True
    assert delete_node["revision_0_span"] == {
        "start_line": 1,
        "start_col": 1,
        "end_line": 5,
        "end_col": 1,
    }
    assert delete_node["revision_1_span"] is None


def test_build_tree_index_does_not_merge_revision_0_into_insert_nodes() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      xmlns:mv="http://www.srcML.org/srcMove"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="foo.hpp">
    <diff:insert mv:id="move-1" pos:start="30:1" pos:end="34:1">
      <function pos:start="10:1|30:1" pos:end="14:1|34:1">
        <name>changed_function</name>
      </function>
    </diff:insert>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    insert_node = tree_by_unit[1]["children"][0]

    assert has_position_data is True
    assert insert_node["revision_0_span"] is None
    assert insert_node["revision_1_span"] == {
        "start_line": 30,
        "start_col": 1,
        "end_line": 34,
        "end_col": 1,
    }


def test_build_tree_index_maps_two_position_spans_to_revision_0_and_revision_1() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <function pos:start="1:1|20:1" pos:end="5:2|25:2">
      <name>main</name>
    </function>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    unit = tree_by_unit[1]
    function = unit["children"][0]

    assert has_position_data is True
    assert function["kind"] == "plain"
    assert function["revision_0_span"] == {
        "start_line": 1,
        "start_col": 1,
        "end_line": 5,
        "end_col": 2,
    }
    assert function["revision_1_span"] == {
        "start_line": 20,
        "start_col": 1,
        "end_line": 25,
        "end_col": 2,
    }


def test_build_tree_index_merges_child_spans_when_parent_has_no_position() -> None:
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:pos="http://www.srcML.org/srcML/position">
  <unit filename="example.cpp">
    <function>
      <type pos:start="1:1" pos:end="1:4">int</type>
      <name pos:start="1:5" pos:end="1:9">main</name>
    </function>
  </unit>
</unit>
"""

    tree_by_unit, has_position_data = build_tree_index(xml)

    unit = tree_by_unit[1]
    function = unit["children"][0]

    assert has_position_data is True
    assert function["revision_0_span"] == {
        "start_line": 1,
        "start_col": 1,
        "end_line": 1,
        "end_col": 9,
    }
    assert function["revision_1_span"] == {
        "start_line": 1,
        "start_col": 1,
        "end_line": 1,
        "end_col": 9,
    }


def test_build_tree_index_skips_diff_ws_by_default() -> None:
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

    tree_by_unit, _ = build_tree_index(xml)

    unit = tree_by_unit[1]
    function = unit["children"][0]

    child_tags = [child["tag"] for child in function["children"]]

    assert child_tags == ["name"]


def test_build_tree_index_can_include_skipped_diff_ws() -> None:
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

    tree_by_unit, _ = build_tree_index(xml, include_skipped_tags=True)

    unit = tree_by_unit[1]
    function = unit["children"][0]

    child_tags = [child["tag"] for child in function["children"]]

    assert child_tags == ["diff:ws", "name"]
