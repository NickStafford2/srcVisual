import { useEffect, useState } from "react";
import {
  cancelHistoryRun,
  fetchHistoryPair,
  fetchHistoryPairs,
  fetchHistoryStatus,
  visualizeHistoryPair,
} from "../api";
import type { VisualizationResult } from "../types";
import type {
  HistoryPairDetail,
  HistoryPairListItem,
  HistoryRun,
  HistoryRunEvent,
  HistorySelection,
  HistoryStatusDocument,
} from "./types";

export function useHistoryData(
  enabled: boolean,
  onVisualization: (payload: VisualizationResult) => void,
) {
  const [status, setStatus] = useState<HistoryStatusDocument | null>(null);
  const [pairs, setPairs] = useState<HistoryPairListItem[]>([]);
  const [nextAfter, setNextAfter] = useState<number | null>(null);
  const [selection, setSelection] = useState<HistorySelection>("moves");
  const [selectedPair, setSelectedPair] = useState<HistoryPairDetail | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPair, setIsLoadingPair] = useState(false);
  const [isVisualizingPair, setIsVisualizingPair] = useState(false);
  const [isCancellingRun, setIsCancellingRun] = useState(false);
  const [activeRun, setActiveRun] = useState<HistoryRun | null>(null);
  const [runEvents, setRunEvents] = useState<HistoryRunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;
    setIsLoading(true);
    setError(null);
    setSelectedPair(null);

    void Promise.all([
      fetchHistoryStatus(),
      fetchHistoryPairs(selection),
    ])
      .then(([statusDocument, pairDocument]) => {
        if (!isActive) return;
        setStatus(statusDocument);
        setPairs(pairDocument.pairs.items);
        setNextAfter(pairDocument.pairs.next_after);
      })
      .catch((loadError: unknown) => {
        if (!isActive) return;
        setError(errorMessage(loadError, "Unable to load repository history."));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [enabled, refreshKey, selection]);

  async function selectPair(pairNumber: number) {
    setIsLoadingPair(true);
    setError(null);
    try {
      const document = await fetchHistoryPair(pairNumber);
      setSelectedPair(document.pair);
    } catch (loadError) {
      setError(errorMessage(loadError, `Unable to load commit pair ${pairNumber}.`));
    } finally {
      setIsLoadingPair(false);
    }
  }

  async function loadMore() {
    if (nextAfter === null || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const document = await fetchHistoryPairs(selection, nextAfter);
      setPairs((current) => [...current, ...document.pairs.items]);
      setNextAfter(document.pairs.next_after);
    } catch (loadError) {
      setError(errorMessage(loadError, "Unable to load more commit pairs."));
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function openVisualization(pairNumber: number) {
    if (isVisualizingPair) return;
    setIsVisualizingPair(true);
    setError(null);
    setActiveRun(null);
    setRunEvents([]);
    try {
      const payload = await visualizeHistoryPair(pairNumber, {
        onRun: setActiveRun,
        onEvent: (event) => {
          setRunEvents((current) =>
            current.some((item) => item.sequence === event.sequence)
              ? current
              : [...current, event],
          );
        },
      });
      onVisualization(payload);
    } catch (loadError) {
      setError(
        errorMessage(
          loadError,
          `Unable to visualize commit pair ${pairNumber}.`,
        ),
      );
    } finally {
      setIsVisualizingPair(false);
    }
  }

  async function cancelVisualization() {
    if (
      activeRun === null ||
      !["queued", "running"].includes(activeRun.status) ||
      activeRun.cancellation_requested ||
      isCancellingRun
    ) {
      return;
    }
    setIsCancellingRun(true);
    setError(null);
    try {
      setActiveRun(await cancelHistoryRun(activeRun.run_id));
    } catch (cancelError) {
      setError(errorMessage(cancelError, "Unable to cancel history run."));
    } finally {
      setIsCancellingRun(false);
    }
  }

  return {
    status,
    pairs,
    nextAfter,
    selection,
    selectedPair,
    isLoading,
    isLoadingMore,
    isLoadingPair,
    isVisualizingPair,
    isCancellingRun,
    activeRun,
    runEvents,
    error,
    setSelection,
    selectPair,
    loadMore,
    openVisualization,
    cancelVisualization,
    refresh: () => setRefreshKey((current) => current + 1),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
