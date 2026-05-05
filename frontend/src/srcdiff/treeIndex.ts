import type { VisualizedFile } from "../types";
import type { SrcDiffTreeNode } from "./types";

export type TreeIndexEntry = {
  node: SrcDiffTreeNode;
  fileIndex: number;
  unitId: number;
  filename: string;
};

export type TreeIndex = Map<string, TreeIndexEntry>;

export function buildForestTreeIndex(files: VisualizedFile[]): TreeIndex {
  const map: TreeIndex = new Map();

  files.forEach((file, fileIndex) => {
    if (!file.tree) return;

    const stack: SrcDiffTreeNode[] = [file.tree];

    while (stack.length > 0) {
      const node = stack.pop()!;

      map.set(node.id, {
        node,
        fileIndex,
        unitId: file.unit_id,
        filename: file.filename,
      });

      for (const child of node.children) {
        stack.push(child);
      }
    }
  });

  return map;
}

export function buildTreeIndex(root: SrcDiffTreeNode | null): TreeIndex {
  if (!root) return new Map();

  return buildForestTreeIndex([
    {
      unit_id: 0,
      filename: "",
      language: null,
      revision_0_source_code: "",
      revision_1_source_code: "",
      tree: root,
    },
  ]);
}
