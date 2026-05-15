from srcvisual.srcmove.existing_annotations import build_move_results_from_moved_srcdiff
from srcvisual.srcmove.move_regions import XmlMoveRegion, classify_xml_move_region_side
from srcvisual.srcmove.move_result_enrichment import build_move_region_paths_by_id


def test_classify_xml_move_region_side_uses_move_attributes_for_subtree_nodes() -> None:
    source_region = XmlMoveRegion(
        path="/src:unit[1]/diff:delete[1]/function[1]",
        tag="function",
        move_id="move-1",
        raw_text="int moved_one() { return 1; }",
        from_paths=(),
        to_paths=("/src:unit[2]/diff:insert[1]",),
        position_start=None,
        position_end=None,
    )
    destination_region = XmlMoveRegion(
        path="/src:unit[2]/diff:insert[1]/function[1]",
        tag="function",
        move_id="move-1",
        raw_text="int moved_one() { return 1; }",
        from_paths=("/src:unit[1]/diff:delete[1]/function[1]",),
        to_paths=(),
        position_start=None,
        position_end=None,
    )

    assert classify_xml_move_region_side(source_region) == "from"
    assert classify_xml_move_region_side(destination_region) == "to"


def test_build_move_region_paths_by_id_accepts_subtree_annotated_regions() -> None:
    regions = {
        "/src:unit[1]/diff:delete[1]/function[1]": XmlMoveRegion(
            path="/src:unit[1]/diff:delete[1]/function[1]",
            tag="function",
            move_id="move-1",
            raw_text="int moved_one() { return 1; }",
            from_paths=(),
            to_paths=("/src:unit[2]/diff:insert[1]",),
            position_start=None,
            position_end=None,
        ),
        "/src:unit[2]/diff:insert[1]": XmlMoveRegion(
            path="/src:unit[2]/diff:insert[1]",
            tag="diff:insert",
            move_id="move-1",
            raw_text="int moved_one() { return 1; }",
            from_paths=("/src:unit[1]/diff:delete[1]/function[1]",),
            to_paths=(),
            position_start=None,
            position_end=None,
        ),
    }

    assert build_move_region_paths_by_id(regions) == {
        "move-1": {
            "from_node_ids": ("/src:unit[1]/diff:delete[1]/function[1]",),
            "to_node_ids": ("/src:unit[2]/diff:insert[1]",),
        }
    }


def test_build_move_results_from_moved_srcdiff_accepts_subtree_annotated_source_regions() -> None:
    moved_srcdiff_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" xmlns:mv="http://www.srcML.org/srcMove" revision="1.0.0" url="old|new">

<unit revision="1.0.0" language="C++" filename="a.cpp|">
  <diff:delete><function mv:id="move-1" mv:to="/src:unit[@filename='|b.cpp']/diff:insert[1]"><type><name>int</name></type> <name>moved_one</name><parameter_list>()</parameter_list> <block>{<block_content>
    <return>return <expr><literal type="number">1</literal></expr>;</return>
  </block_content>}</block></function></diff:delete>
</unit>

<unit revision="1.0.0" language="C++" filename="|b.cpp">
  <diff:insert mv:from="/src:unit[@filename='a.cpp|']/diff:delete[1]/src:function[src:name='moved_one']" mv:id="move-1"><function><type><name>int</name></type> <name>moved_one</name><parameter_list>()</parameter_list> <block>{<block_content>
    <return>return <expr><literal type="number">1</literal></expr>;</return>
  </block_content>}</block></function></diff:insert>
</unit>

</unit>
"""

    move_results = build_move_results_from_moved_srcdiff(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=False,
    )

    assert move_results["move_count"] == 1
    assert move_results["moves"] == [
        {
            "move_id": "move-1",
            "from_xpaths": ["/src:unit[1]/diff:delete[1]/function[1]"],
            "to_xpaths": ["/src:unit[2]/diff:insert[1]"],
            "from_raw_texts": ["int moved_one() {\n    return 1;\n  }"],
            "to_raw_texts": ["int moved_one() {\n    return 1;\n  }"],
        }
    ]
