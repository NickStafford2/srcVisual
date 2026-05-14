import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse } from "../types";
import type { BulkHighlightKind, HighlightMode } from "./highlightContext";
import {
  buildHighlightedNodeIds,
  buildHighlightedSpans,
  buildSourceHighlightedSpansByUnitId,
  getHighlightedEntries,
} from "./highlights";
import { buildMoveIndex } from "./moveIndex";
import { type SrcDiffHighlight } from "./selection";
import { buildForestTreeIndex, type SrcDiffNodeEntry } from "./treeIndex";

export type SrcDiffSelectionState = {
  moveNodesById: Map<string, SrcDiffNodeEntry[]>;
  highlightedNodes: SrcDiffNodeEntry[];
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  sourceHighlightedSpansByUnitId: Map<number, SrcDiffHighlight[]>;
  highlightMode: HighlightMode;
  unhighlightNode: (nodeId: string) => void;
  highlightNode: (nodeId: string) => void;
  highlightMoveGroup: (nodeId: string) => void;
  highlightAllMoves: () => void;
  highlightAllInserts: () => void;
  highlightAllDeletes: () => void;
  clearHighlights: () => void;
};

const EMPTY_HIGHLIGHT_MODE: HighlightMode = {
  move: false,
  insert: false,
  delete: false,
};

export function useSrcDiffSelection(
  data: VisualizeResponse | null,
): SrcDiffSelectionState {
  const [manualHighlightNodeId, setManualHighlightNodeId] = useState<
    string | null
  >(null);
  const [manualHighlightScope, setManualHighlightScope] = useState<
    "node" | "move-group"
  >("node");
  const [highlightMode, setHighlightMode] =
    useState<HighlightMode>(EMPTY_HIGHLIGHT_MODE);
  const [suppressedHighlightedNodeIds, setSuppressedHighlightedNodeIds] =
    useState<Set<string>>(new Set());

  const files = data?.files ?? [];

  const treeIndex = useMemo(() => buildForestTreeIndex(files), [files]);

  const treeEntries = useMemo(
    () => Array.from(treeIndex.values()),
    [treeIndex],
  );

  const moveIndex = useMemo(
    () => buildMoveIndex(data?.move_results, treeIndex, files),
    [data?.move_results, treeIndex, files],
  );

  const manualHighlightEntry = manualHighlightNodeId
    ? (treeIndex.get(manualHighlightNodeId) ?? null)
    : null;

  const manualHighlightMoveId = manualHighlightEntry?.node.move_id ?? null;

  const highlightedNodes = useMemo(
    () =>
      getHighlightedEntries({
        highlightMode,
        manualHighlightEntry,
        manualHighlightMoveId,
        manualHighlightScope,
        treeEntries,
        moveIndex,
        suppressedNodeIds: suppressedHighlightedNodeIds,
      }),
    [
      highlightMode,
      manualHighlightEntry,
      manualHighlightMoveId,
      manualHighlightScope,
      treeEntries,
      moveIndex,
      suppressedHighlightedNodeIds,
    ],
  );

  const highlightedNodeIds = useMemo(
    () => buildHighlightedNodeIds(highlightedNodes),
    [highlightedNodes],
  );

  const highlightedSpans = useMemo(
    () => buildHighlightedSpans(highlightedNodes),
    [highlightedNodes],
  );

  const sourceHighlightedSpansByUnitId = useMemo(
    () => buildSourceHighlightedSpansByUnitId(files, highlightedSpans),
    [files, highlightedSpans],
  );

  useEffect(() => {
    setManualHighlightNodeId(null);
    setManualHighlightScope("node");
    setHighlightMode(EMPTY_HIGHLIGHT_MODE);
    setSuppressedHighlightedNodeIds(new Set());
  }, [data]);

  useEffect(() => {
    if (!manualHighlightNodeId) return;

    if (!treeIndex.has(manualHighlightNodeId)) {
      setManualHighlightNodeId(null);
    }
  }, [manualHighlightNodeId, treeIndex]);

  function setManualHighlight(
    nodeId: string,
    scope: "node" | "move-group",
  ) {
    setSuppressedHighlightedNodeIds(new Set());
    setManualHighlightNodeId(nodeId);
    setManualHighlightScope(scope);
  }

  function highlightNode(nodeId: string) {
    setManualHighlight(nodeId, "node");
  }

  function highlightMoveGroup(nodeId: string) {
    setManualHighlight(nodeId, "move-group");
  }

  function highlightAllMoves() {
    toggleHighlightKind("move");
  }

  function highlightAllInserts() {
    toggleHighlightKind("insert");
  }

  function highlightAllDeletes() {
    toggleHighlightKind("delete");
  }

  function clearHighlights() {
    setHighlightMode(EMPTY_HIGHLIGHT_MODE);
    setSuppressedHighlightedNodeIds(new Set());
    setManualHighlightNodeId(null);
    setManualHighlightScope("node");
  }

  function unhighlightNode(nodeId: string) {
    setSuppressedHighlightedNodeIds((current) => {
      const next = new Set(current);
      next.add(nodeId);
      return next;
    });
  }

  function toggleHighlightKind(kind: BulkHighlightKind) {
    setHighlightMode((current) => ({
      ...current,
      [kind]: !current[kind],
    }));
    setSuppressedHighlightedNodeIds(new Set());
  }

  return {
    moveNodesById: moveIndex,
    highlightedNodes,
    highlightedNodeIds,
    highlightedSpans,
    sourceHighlightedSpansByUnitId,
    highlightMode,
    unhighlightNode,
    highlightNode,
    highlightMoveGroup,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
  };
}
