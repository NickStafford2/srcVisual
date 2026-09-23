import { useEffect, useState } from "react";
import {
  fetchHistoryPair,
  fetchHistoryPairs,
  fetchHistoryStatus,
  visualizeHistoryPair,
} from "../api";
import type { VisualizeResponse } from "../types";
import type {
  HistoryPairDetail,
  HistoryPairListItem,
  HistorySelection,
  HistoryStatusDocument,
} from "./types";

export function useHistoryData(
  enabled: boolean,
  onVisualization: (payload: VisualizeResponse) => void,
  includeSkippedTags: boolean,
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
    try {
      const payload = await visualizeHistoryPair(pairNumber, {
        includeSkippedTags,
        pruningLevel: "move-only",
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
    error,
    setSelection,
    selectPair,
    loadMore,
    openVisualization,
    refresh: () => setRefreshKey((current) => current + 1),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
