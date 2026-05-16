import type { SrcDiffTreeNode } from "../../srcdiff/types";

export function getTreeNodeDisplayLabel(
  node: SrcDiffTreeNode,
  depth: number,
): string {
  if (depth === 0 && node.label.startsWith("unit: ")) {
    return node.label.slice("unit: ".length);
  }

  return node.label;
}

export function getTreeNodeKindClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "rounded-full bg-diff-delete/20 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-delete uppercase";
    case "insert":
      return "rounded-full bg-diff-insert/20 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-insert uppercase";
    case "move":
      return "rounded-full bg-diff-move-1/20 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-move-1 uppercase";
    default:
      return "rounded-full bg-diff-plain/15 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-plain uppercase";
  }
}

export function getTreeNodeLabelClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "text-diff-delete";
    case "insert":
      return "text-diff-insert";
    case "move":
      return "text-diff-move-1";
    default:
      return "text-slate-100";
  }
}

export function getTreeNodeHighlightClasses(
  kind: SrcDiffTreeNode["kind"],
): string {
  switch (kind) {
    case "delete":
      return "bg-diff-delete/12 ring-1 ring-diff-delete/20";
    case "insert":
      return "bg-diff-insert/12 ring-1 ring-diff-insert/20";
    case "move":
      return "bg-diff-move-1/12 ring-1 ring-diff-move-1/20";
    default:
      return "bg-diff-plain/12 ring-1 ring-diff-plain/20";
  }
}
