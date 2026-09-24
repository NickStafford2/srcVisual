import type { HighlightKind } from "../../srcdiff/types";

export type MoveSegmentVisualState = "inactive" | "visible" | "selected";

export function getSourceSegmentClasses(
  kind: HighlightKind,
  highlighted: boolean,
  moveState: MoveSegmentVisualState = "visible",
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
      return getMoveSegmentClasses(moveState);
    default:
      return "rounded-md bg-diff-plain/25 px-0.5";
  }
}

function getMoveSegmentClasses(state: MoveSegmentVisualState): string {
  if (state === "selected") {
    return "rounded-md bg-diff-move-1/35 px-0.5 text-amber-50 ring-1 ring-diff-move-1/70";
  }
  if (state === "visible") {
    return "rounded-md bg-diff-move-1/25 px-0.5 text-amber-100";
  }
  return "rounded-md bg-diff-move-1/10 px-0.5 text-amber-100/80";
}
