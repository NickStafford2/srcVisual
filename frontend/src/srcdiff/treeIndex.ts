import type { SrcDiffTreeNode } from "./types";

export type TreeIndex = Map<string, SrcDiffTreeNode>;

export function buildTreeIndex(root: SrcDiffTreeNode | null): TreeIndex {
  const map: TreeIndex = new Map();

  if (!root) return map;

  const stack: SrcDiffTreeNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;
    map.set(node.id, node);

    for (const child of node.children) {
      stack.push(child);
    }
  }

  return map;
}
