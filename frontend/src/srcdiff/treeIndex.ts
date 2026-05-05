import type { VisualizedFile } from "../types";
import type { SrcDiffTreeNode } from "./types";

export type SrcDiffNodeEntry = {
  node: SrcDiffTreeNode;
  fileIndex: number;
  unitId: number;
  filename: string;
};

export type TreeIndex = Map<string, SrcDiffNodeEntry>;

export function buildForestTreeIndex(files: VisualizedFile[]): TreeIndex {
  const index: TreeIndex = new Map();

  files.forEach((file, fileIndex) => {
    if (!file.tree) return;

    for (const node of walkTree(file.tree)) {
      index.set(node.id, {
        node,
        fileIndex,
        unitId: file.unit_id,
        filename: file.filename,
      });
    }
  });

  return index;
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

function walkTree(root: SrcDiffTreeNode): SrcDiffTreeNode[] {
  const nodes: SrcDiffTreeNode[] = [];
  const stack: SrcDiffTreeNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;
    nodes.push(node);

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push(node.children[index]);
    }
  }

  return nodes;
}
