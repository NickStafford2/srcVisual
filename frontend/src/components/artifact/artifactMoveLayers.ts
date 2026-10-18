import type { ArtifactMoveSummary } from "../../types";

export type MoveLayer = "srcmove" | "srcdiff";

export function moveLayer(move: ArtifactMoveSummary): MoveLayer {
  return (
    move.move_origin ??
    (move.report_kind ||
    move.member_move_ids?.length ||
    move.content_relationship
      ? "srcmove"
      : "srcdiff")
  );
}

export function defaultVisibleMoveIds(
  moves: ArtifactMoveSummary[],
): Set<string> {
  const layer = moves.some((move) => moveLayer(move) === "srcmove")
    ? "srcmove"
    : "srcdiff";
  return new Set(
    moves
      .filter((move) => moveLayer(move) === layer)
      .map((move) => move.move_id),
  );
}
