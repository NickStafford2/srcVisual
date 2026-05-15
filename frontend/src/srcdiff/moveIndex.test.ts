import { describe, expect, it } from "vitest";
import type { VisualizedFile } from "../types";
import { buildMoveIndex } from "./moveIndex";
import { buildForestTreeIndex } from "./treeIndex";
import type { SrcDiffTreeNode } from "./types";

function buildNode(id: string): SrcDiffTreeNode {
  return {
    id,
    path: id,
    tag: "diff:delete",
    label: id,
    kind: "move",
    move_id: "move-1",
    srcdiff_attributes: {
      position: null,
      move: { id: "move-1" },
      unit: null,
      diff: null,
    },
    xml_span: null,
    revision_0_span: null,
    revision_1_span: null,
    children: [],
  };
}

describe("buildMoveIndex", () => {
  it("requires backend node ids instead of falling back to raw xpaths", () => {
    const _files: VisualizedFile[] = [
      {
        unit_id: 1,
        filename: "example.cpp",
        revision_0_filename: "example.cpp",
        revision_1_filename: "example.cpp",
        language: "C++",
        revision_0_source_code: "",
        revision_1_source_code: "",
        tree: buildNode("/src:unit[1]/diff:delete[1]"),
      },
    ];
    const _treeIndex = buildForestTreeIndex(_files);

    expect(() =>
      buildMoveIndex(
        {
          move_count: 1,
          annotated_regions: 2,
          regions_total: 2,
          candidates_total: 1,
          groups_total: 1,
          moves: [
            {
              move_id: "move-1",
              from_xpaths: ["/src:unit[@filename='example.cpp']/diff:delete[1]"],
              from_node_ids: [],
              to_xpaths: ["/src:unit[@filename='example.cpp']/diff:insert[1]"],
              to_node_ids: [],
              from_raw_texts: ["old"],
              to_raw_texts: ["new"],
            },
          ],
        },
        _treeIndex,
        _files,
      ),
    ).toThrow("missing frontend node ids");
  });
});
