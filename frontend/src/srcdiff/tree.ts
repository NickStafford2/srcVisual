import type { SrcDiffTreeNode } from "./types";

export function findTreeNodeById(
  node: SrcDiffTreeNode | null | undefined,
  id: string | null,
): SrcDiffTreeNode | null {
  if (!node || !id) {
    return null;
  }

  if (node.id === id) {
    return node;
  }

  for (const child of node.children) {
    const match = findTreeNodeById(child, id);
    if (match) {
      return match;
    }
  }

  return null;
}
