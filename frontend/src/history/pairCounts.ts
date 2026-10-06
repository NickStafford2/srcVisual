import type { HistoryPairListItem } from "./types";

// Normalize the display count once so tables and activity charts agree.
// Preserve the producer's atomic count for diagnostic inspection.
export function withReportedMoveCount(pair: HistoryPairListItem): HistoryPairListItem {
  if (pair.reported_move_count !== undefined && pair.reported_move_count !== null &&
      (!Number.isInteger(pair.reported_move_count) || pair.reported_move_count < 0)) {
    throw new Error("Backend returned an invalid reported move count.");
  }
  return { ...pair, atomic_move_count: pair.move_count, move_count: pair.reported_move_count ?? pair.move_count };
}
