import type { VisualizeResponse } from "../../types";

export const singleUnitMoveId = "move-1";

export const singleUnitHighlightFixture: VisualizeResponse = {
  source_filename: "pasted.srcdiff.xml",
  unit_count: 1,
  has_position_data: true,
  moved_srcdiff_xml: `<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" xmlns:mv="http://www.srcML.org/srcMove" filename="basic.cpp">
  <diff:delete mv:id="move-1" mv:to="/src:unit[1]/diff:insert[1]">int a;</diff:delete>
  <diff:insert mv:from="/src:unit[1]/diff:delete[1]" mv:id="move-1">int a;</diff:insert>
</unit>
`,
  move_results: {
    annotated_regions: 2,
    candidates_total: 1,
    groups_total: 1,
    move_count: 1,
    moves: [
      {
        move_id: singleUnitMoveId,
        from_xpaths: ["/src:unit[1]/diff:delete[1]"],
        from_node_ids: ["/src:unit[1]/diff:delete[1]"],
        to_xpaths: ["/src:unit[1]/diff:insert[1]"],
        to_node_ids: ["/src:unit[1]/diff:insert[1]"],
        from_raw_texts: ["int a;"],
        to_raw_texts: ["int a;"],
      },
    ],
    regions_total: 2,
  },
  files: [
    {
      unit_id: 1,
      filename: "basic.cpp",
      language: "C++",
      revision_0_source_code: "int a;\n",
      revision_1_source_code: "int a;\n",
      tree: {
        id: "/src:unit[1]",
        path: "/src:unit[1]",
        tag: "unit",
        label: "unit: basic.cpp",
        kind: "plain",
        move_id: null,
        srcdiff_attributes: {
          position: null,
          move: null,
          unit: {
            filename: "basic.cpp",
            language: "C++",
            revision: "1.0.0",
            url: null,
            hash: null,
            timestamp: null,
          },
          diff: null,
        },
        xml_span: {
          start_line: 2,
          start_col: 1,
          end_line: 4,
          end_col: 68,
        },
        revision_0_span: {
          start_line: 1,
          start_col: 1,
          end_line: 1,
          end_col: 6,
        },
        revision_1_span: {
          start_line: 1,
          start_col: 1,
          end_line: 1,
          end_col: 6,
        },
        children: [
          {
            id: "/src:unit[1]/diff:delete[1]",
            path: "/src:unit[1]/diff:delete[1]",
            tag: "diff:delete",
            label: "diff:delete",
            kind: "move",
            move_id: singleUnitMoveId,
            srcdiff_attributes: {
              position: null,
              move: {
                id: singleUnitMoveId,
              },
              unit: null,
              diff: {
                revision: null,
              },
            },
            xml_span: {
              start_line: 3,
              start_col: 3,
              end_line: 3,
              end_col: 76,
            },
            revision_0_span: {
              start_line: 1,
              start_col: 1,
              end_line: 1,
              end_col: 6,
            },
            revision_1_span: null,
            children: [],
          },
          {
            id: "/src:unit[1]/diff:insert[1]",
            path: "/src:unit[1]/diff:insert[1]",
            tag: "diff:insert",
            label: "diff:insert",
            kind: "move",
            move_id: singleUnitMoveId,
            srcdiff_attributes: {
              position: null,
              move: {
                id: singleUnitMoveId,
              },
              unit: null,
              diff: {
                revision: null,
              },
            },
            xml_span: {
              start_line: 4,
              start_col: 3,
              end_line: 4,
              end_col: 78,
            },
            revision_0_span: null,
            revision_1_span: {
              start_line: 1,
              start_col: 1,
              end_line: 1,
              end_col: 6,
            },
            children: [],
          },
        ],
      },
    },
  ],
};
