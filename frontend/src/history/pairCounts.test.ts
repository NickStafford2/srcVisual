import { expect, it } from "vitest";
import { withReportedMoveCount } from "./pairCounts";
import type { HistoryPairListItem } from "./types";
const pair: HistoryPairListItem = { number: 1, distance_from_newest: 0, old_commit: "a", new_commit: "b", status: "completed", changed_path_count: 1, analyzable_path_count: 1, move_count: 5, elapsed_seconds: 0, checkpointed: false, invocation_id: "test" };
it("uses grouped reports in all history displays and preserves atomic counts", () => {
  expect(withReportedMoveCount({ ...pair, reported_move_count: 2 })).toMatchObject({ move_count: 2, atomic_move_count: 5 });
  expect(withReportedMoveCount(pair)).toMatchObject({ move_count: 5, atomic_move_count: 5 });
  expect(withReportedMoveCount({ ...pair, reported_move_count: 0 }).move_count).toBe(0);
  expect(() => withReportedMoveCount({ ...pair, reported_move_count: -1 })).toThrow();
});
