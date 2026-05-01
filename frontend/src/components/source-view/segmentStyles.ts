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
      return "rounded-md bg-red-300/85 px-0.5";
    case "insert":
      return "rounded-md bg-sky-300/85 px-0.5";
    case "move":
      return "rounded-md bg-amber-300/85 px-0.5";
    default:
      return "rounded-md bg-emerald-300/85 px-0.5";
  }
}
