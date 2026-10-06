import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activityPoints, HistoryActivityChart } from "./HistoryActivityChart";
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


afterEach(cleanup);

describe("historical activity scale", () => {
  it("toggles log scaling for counts and the raw-count mean while preserving zero and pair selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<HistoryActivityChart series={[pair(1, 99), pair(2, 9), pair(3, 0), pair(4, 0), pair(5, 0)]} isLoading={false} error={null} selectedPair={null} onSelect={onSelect} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Rolling average" }), "5");
    const toggle = screen.getByRole("checkbox", { name: "Logarithmic Y axis" });
    const zero = screen.getByRole("button", { name: "Pair 3: 0 detected moves" });
    const small = screen.getByRole("button", { name: "Pair 2: 9 detected moves" });
    const peak = screen.getByRole("button", { name: "Pair 1: 99 detected moves" });
    const zeroY = Number(zero.getAttribute("cy"));
    const linearY = Number(small.getAttribute("cy"));
    const linearMean = screen.getByLabelText("Rolling mean").getAttribute("d");
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(Number(small.getAttribute("cy"))).toBeCloseTo(119);
    expect(Number(small.getAttribute("cy"))).toBeLessThan(linearY);
    expect(Number(zero.getAttribute("cy"))).toBe(zeroY);
    expect(Number(peak.getAttribute("cy"))).toBe(20);
    expect(screen.getByLabelText("Rolling mean").getAttribute("d")).not.toBe(linearMean);
    expect(screen.getByText(/Log scale uses log10/)).toBeInTheDocument();
    await user.click(small);
    expect(onSelect).toHaveBeenCalledWith(2);
    await user.click(toggle);
    expect(Number(small.getAttribute("cy"))).toBe(linearY);
    expect(screen.getByLabelText("Rolling mean").getAttribute("d")).toBe(linearMean);
  });

  it("keeps an all-zero log chart finite", async () => {
    const user = userEvent.setup();
    render(<HistoryActivityChart series={[pair(1, 0)]} isLoading={false} error={null} selectedPair={null} onSelect={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: "Logarithmic Y axis" }));
    expect(screen.getByRole("button", { name: "Pair 1: 0 detected moves" }).getAttribute("cy")).toBe("218");
    expect(screen.getByLabelText("Raw move counts").getAttribute("d")).not.toMatch(/NaN|Infinity/);
  });
});
