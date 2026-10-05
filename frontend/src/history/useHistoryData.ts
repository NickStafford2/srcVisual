import { useEffect, useMemo, useState } from "react";
import { useHistorySeries } from "./useHistorySeries";
import {
  cancelHistoryRun,
  fetchHistoryPair,
  fetchHistoryPairs,
  fetchHistoryRepositories,
  fetchHistoryStatus,
  visualizeHistoryPair,
} from "../api";
import type { ArtifactManifest, ComparisonContext } from "../types";
import type {
  HistoryPairDetail,
  HistoryExtension,
  HistoryPairListItem,
  HistoryRepositoryOption,
  HistoryRun,
  HistoryRunEvent,
  HistorySelection,
  HistoryStatusDocument,
} from "./types";

export function useHistoryData(
  enabled: boolean,
  onVisualization: (
    payload: ArtifactManifest,
    context?: ComparisonContext,
  ) => void,
) {
  const [repositories, setRepositories] = useState<HistoryRepositoryOption[]>(
    [],
  );
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
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
  const [extension, setExtension] = useState<HistoryExtension | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const seriesIdentity = status ? JSON.stringify([selectedRepositoryId, status.analysis, status.history.newest_commit, status.definition, refreshKey]) : null;
  const seriesCoverage = status && status.state !== "running" && !["queued", "running"].includes(extension?.state ?? "") ? status.coverage.durable_commit_pairs : null;
  // During an extension, retain the initially captured range until it finishes.
  const seriesRequest = useMemo(() => status && seriesIdentity !== null ? {
    identity: seriesIdentity,
    covered: status.coverage.durable_commit_pairs,
  } : null, [seriesIdentity, seriesCoverage]);
  const historySeries = useHistorySeries(enabled ? selectedRepositoryId : "", seriesRequest);

  useEffect(() => {
    if (!enabled || !selectedRepositoryId) return;
    let active = true;
    let completedId = "";
    setExtension(null);
    async function poll() {
      try {
        const response = await fetch(`/api/history/extensions?repository=${encodeURIComponent(selectedRepositoryId)}`);
        if (!response.ok) return;
        const document = await response.json() as { extension: HistoryExtension | null };
        if (!active) return;
        setExtension(document.extension);
        if (document.extension && ["queued", "running"].includes(document.extension.state)) {
          const freshStatus = await fetchHistoryStatus(selectedRepositoryId);
          if (active) setStatus(freshStatus);
        }
        if (document.extension?.state === "completed" && completedId !== document.extension.id) {
          const [freshStatus, freshPairs] = await Promise.all([fetchHistoryStatus(selectedRepositoryId), fetchHistoryPairs(selectedRepositoryId, selection)]);
          if (active) { setStatus(freshStatus); setPairs(freshPairs.pairs.items); setNextAfter(freshPairs.pairs.next_after); }
        }
        if (document.extension?.state === "completed") completedId = document.extension.id;
      } catch { /* A repository may not be initialized yet; the status request reports that error. */ }
    }
    void poll();
    const interval = window.setInterval(() => void poll(), 2000);
    return () => { active = false; window.clearInterval(interval); };
  }, [enabled, selectedRepositoryId, selection]);

  async function extendHistory(count: number) {
    setIsExtending(true);
    setError(null);
    try {
      const response = await fetch(`/api/history/extensions?repository=${encodeURIComponent(selectedRepositoryId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }) });
      const document = await response.json() as { extension: HistoryExtension; error?: string };
      if (!response.ok) throw new Error(document.error ?? "Unable to extend history.");
      setExtension(document.extension);
    } catch (problem) { setError(errorMessage(problem, "Unable to extend history.")); }
    finally { setIsExtending(false); }
  }

  async function saveSnapshot() {
    setIsSavingSnapshot(true);
    setError(null);
    try {
      const response = await fetch(`/api/history/snapshot?repository=${encodeURIComponent(selectedRepositoryId)}`, { method: "POST" });
      if (!response.ok) { const document = await response.json(); throw new Error(document.error ?? "Unable to save snapshot."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)/)?.[1] ?? "history-snapshot.zip";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (problem) { setError(errorMessage(problem, "Unable to save snapshot.")); }
    finally { setIsSavingSnapshot(false); }
  }

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;
    setError(null);
    void fetchHistoryRepositories()
      .then((document) => {
        if (!isActive) return;
        setRepositories(document.repositories);
        setSelectedRepositoryId((current) =>
          document.repositories.some((repository) => repository.id === current)
            ? current
            : document.default_id,
        );
      })
      .catch((loadError: unknown) => {
        if (!isActive) return;
        setError(errorMessage(loadError, "Unable to load repositories."));
      });

    return () => {
      isActive = false;
    };
  }, [enabled, refreshKey]);

  useEffect(() => {
    if (!enabled || !selectedRepositoryId) return;

    let isActive = true;
    setIsLoading(true);
    setError(null);
    setStatus(null);
    setPairs([]);
    setNextAfter(null);
    setSelectedPair(null);
    setActiveRun(null);
    setRunEvents([]);

    void Promise.all([
      fetchHistoryStatus(selectedRepositoryId),
      fetchHistoryPairs(selectedRepositoryId, selection),
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
  }, [enabled, refreshKey, selectedRepositoryId, selection]);

  async function selectPair(pairNumber: number) {
    setIsLoadingPair(true);
    setError(null);
    try {
      const document = await fetchHistoryPair(selectedRepositoryId, pairNumber);
      setSelectedPair(document.pair);
    } catch (loadError) {
      setError(
        errorMessage(loadError, `Unable to load commit pair ${pairNumber}.`),
      );
    } finally {
      setIsLoadingPair(false);
    }
  }

  async function loadMore() {
    if (nextAfter === null || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const document = await fetchHistoryPairs(
        selectedRepositoryId,
        selection,
        nextAfter,
      );
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
      const payload = await visualizeHistoryPair(
        selectedRepositoryId,
        pairNumber,
        {
          onRun: setActiveRun,
          onEvent: (event) => {
            setRunEvents((current) =>
              current.some((item) => item.sequence === event.sequence)
                ? current
                : [...current, event],
            );
          },
        },
      );
      const openedPair = (await fetchHistoryPair(selectedRepositoryId, pairNumber)).pair;
      setSelectedPair(openedPair);
      onVisualization(payload, {
        mode: "history",
        label: `${
          repositories.find(
            (repository) => repository.id === selectedRepositoryId,
          )?.label ??
          status?.analysis.repository ??
          "Repository"
        } · Pair ${pairNumber}`,
        before: openedPair.old_commit,
        after: openedPair.new_commit,
      });
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
    ...historySeries,
    extension,
    isExtending,
    isSavingSnapshot,
    extendHistory,
    saveSnapshot,
    repositories,
    selectedRepositoryId,
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
    setSelectedRepositoryId,
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
