import { useEffect, useState } from "react";
import { fetchHistoryPairs } from "../api";
import type { HistoryPairListItem } from "./types";

// Separate from the filtered list: every saved outcome contributes to coverage.
export function useHistorySeries(repository: string, request: { identity: string; covered: number } | null) {
  const [series, setSeries] = useState<HistoryPairListItem[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  useEffect(() => {
    setSeries([]);
    setSeriesError(null);
    setIsLoadingSeries(false);
    if (!repository || request === null) return;
    const controller = new AbortController();
    setIsLoadingSeries(true);
    async function load() {
      try {
        const items: HistoryPairListItem[] = [];
        let after: number | undefined;
        const cursors = new Set<number>();
        // Capture the initial covered range so a running extension cannot keep
        // moving the end of this request. A refresh loads the next range.
        const covered = request!.covered;
        while (!controller.signal.aborted) {
          const page = await fetchHistoryPairs(repository, "all", after, controller.signal);
          items.push(...page.pairs.items.filter(pair => pair.number <= covered));
          const next = page.pairs.next_after;
          if (next === null || next >= covered - 1) break;
          if (cursors.has(next) || (after !== undefined && next <= after)) {
            throw new Error("History series returned a non-advancing cursor.");
          }
          cursors.add(next);
          after = next;
        }
        if (!controller.signal.aborted) setSeries(items);
      } catch (problem) {
        if (!controller.signal.aborted) setSeriesError(problem instanceof Error ? problem.message : "Unable to load move activity.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingSeries(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [repository, request]);

  return { series, isLoadingSeries, seriesError };
}
