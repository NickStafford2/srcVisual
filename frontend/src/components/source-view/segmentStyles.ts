import type { HighlightKind } from "../../srcdiff/types";

export function getSourceSegmentClasses(
  kind: HighlightKind,
  highlighted: boolean,
): string {
  if (!highlighted) {
    return "";
  }

  switch (kind) {
    case "delete":
      return "rounded-md bg-diff-delete/25 px-0.5";
    case "insert":
      return "rounded-md bg-diff-insert/25 px-0.5";
    case "move":
      return "rounded-md bg-diff-move-1/25 px-0.5";
    default:
      return "rounded-md bg-diff-plain/25 px-0.5";
  }
}
