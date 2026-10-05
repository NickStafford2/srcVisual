import { describe, expect, it } from "vitest";
import { activityPoints } from "./HistoryActivityChart";
import type { HistoryPairListItem } from "./types";

function pair(number: number, count: number, status = "completed"): HistoryPairListItem {
  return { number, distance_from_newest: number - 1, old_commit: "a", new_commit: "b", status, changed_path_count: 1, analyzable_path_count: 1, move_count: count, elapsed_seconds: 0, checkpointed: false, invocation_id: "test" };
}

describe("historical activity calculations", () => {
  it("orders oldest first and includes successful zero-move comparisons in the mean", () => {
    const points = activityPoints([pair(1, 6), pair(3, 0), pair(2, 3)], 3);
    expect(points.map(point => point.pair.number)).toEqual([3, 2, 1]);
    expect(points.map(point => point.average)).toEqual([null, null, 3]);
  });

  it.each(["export_failed", "no_analyzable_change"])("does not turn %s into zero or smooth across it", status => {
    const points = activityPoints([pair(5, 4), pair(4, 0, status), pair(3, 0), pair(2, 2), pair(1, 4)], 2);
    expect(points.map(point => point.average)).toEqual([null, null, null, 1, 3]);
  });

  it("breaks the average across missing observations and supports turning it off", () => {
    expect(activityPoints([pair(3, 2), pair(1, 4)], 2).every(point => point.average === null)).toBe(true);
    expect(activityPoints([pair(1, 4)], 0)[0].average).toBeNull();
  });
});
