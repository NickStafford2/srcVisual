import { useEffect, useMemo, useState } from "react";
import type {
  MoveSourceHighlight,
  VisualizeResponse,
  VisualizedFile,
} from "../types";
import type { HighlightMode } from "./highlightContext";
import type { HighlightKind, SrcDiffTreeNode } from "./types";
import {
  getNodeHighlight,
  getSelectionSpans,
  type SrcDiffHighlight,
  type SrcDiffSelectionSpans,
} from "./selection";
import { buildForestTreeIndex } from "./treeIndex";

export type SrcDiffSelectionState = {
  moveNodesById: Map<
    string,
    {
      node: SrcDiffTreeNode;
      fileIndex: number;
      filename: string | null;
    }[]
  >;
  selectedMoveId: string | null;
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  highlightedNodes: {
    node: SrcDiffTreeNode;
    fileIndex: number;
    filename: string | null;
  }[];
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  sourceHighlightedSpansByFileIndex: Map<number, SrcDiffHighlight[]>;
  highlightMode: HighlightMode;
  unhighlightNode: (nodeId: string) => void;
  setSelectedFileIndex: (index: number) => void;
  setSelectedNodeId: (nodeId: string) => void;
  highlightAllMoves: () => void;
  highlightAllInserts: () => void;
  highlightAllDeletes: () => void;
  clearHighlights: () => void;
};

export function useSrcDiffSelection(
  data: VisualizeResponse | null,
): SrcDiffSelectionState {
  const [selectedFileIndex, setSelectedFileIndexState] = useState(0);
  const [selectedNodeId, setSelectedNodeIdState] = useState<string | null>(
    null,
  );
  const [highlightMode, setHighlightMode] =
    useState<HighlightMode>("selection");
  const [suppressedHighlightedNodeIds, setSuppressedHighlightedNodeIds] =
    useState<Set<string>>(new Set());

  const files = data?.files ?? [];
  const selectedFile = files[selectedFileIndex] ?? null;

  const treeIndex = useMemo(() => buildForestTreeIndex(files), [files]);
  const treeEntries = useMemo(
    () => Array.from(treeIndex.entries()),
    [treeIndex],
  );

  const selectedNodeEntry = selectedNodeId
    ? (treeIndex.get(selectedNodeId) ?? null)
    : null;

  const selectedNode = selectedNodeEntry?.node ?? null;
  const selectedNodeFileIndex = selectedNodeEntry?.fileIndex ?? null;
  const selectedMoveId = selectedNode?.move_id ?? null;

  const selectedSpans = useMemo(
    () => getSelectionSpans(selectedNode),
    [selectedNode],
  );

  const moveNodesById = useMemo(() => {
    const next = new Map<
      string,
      {
        node: SrcDiffTreeNode;
        fileIndex: number;
        filename: string | null;
      }[]
    >();

    for (const [, entry] of treeEntries) {
      if (!entry.node.move_id) {
        continue;
      }

      const nodes = next.get(entry.node.move_id) ?? [];
      nodes.push({
        node: entry.node,
        fileIndex: entry.fileIndex,
        filename: files[entry.fileIndex]?.filename ?? null,
      });
      next.set(entry.node.move_id, nodes);
    }

    return next;
  }, [files, treeEntries]);

  const baseHighlightedEntries = useMemo(() => {
    if (highlightMode === "all-moves") {
      return treeEntries.filter(([, entry]) => entry.node.kind === "move");
    }

    if (highlightMode === "all-inserts") {
      return treeEntries.filter(([, entry]) => entry.node.kind === "insert");
    }

    if (highlightMode === "all-deletes") {
      return treeEntries.filter(([, entry]) => entry.node.kind === "delete");
    }

    if (!selectedNodeId || !selectedNodeEntry) {
      return [];
    }

    const selectedMoveId = selectedNodeEntry.node.move_id;

    if (selectedNodeEntry.node.kind === "move" && selectedMoveId) {
      return treeEntries.filter(
        ([, entry]) =>
          entry.node.kind === "move" && entry.node.move_id === selectedMoveId,
      );
    }

    return [[selectedNodeId, selectedNodeEntry]] as typeof treeEntries;
  }, [highlightMode, selectedNodeId, selectedNodeEntry, treeEntries]);

  const highlightedEntries = useMemo(() => {
    if (suppressedHighlightedNodeIds.size === 0) {
      return baseHighlightedEntries;
    }

    return baseHighlightedEntries.filter(
      ([nodeId]) => !suppressedHighlightedNodeIds.has(nodeId),
    );
  }, [baseHighlightedEntries, suppressedHighlightedNodeIds]);

  const highlightedNodeIds = useMemo(() => {
    return new Set(highlightedEntries.map(([nodeId]) => nodeId));
  }, [highlightedEntries]);

  const highlightedNodes = useMemo(() => {
    return highlightedEntries.map(([, entry]) => ({
      node: entry.node,
      fileIndex: entry.fileIndex,
      filename: files[entry.fileIndex]?.filename ?? null,
    }));
  }, [files, highlightedEntries]);

  const highlightedSpans = useMemo<SrcDiffHighlight[]>(() => {
    return highlightedEntries.map(([, entry]) =>
      getNodeHighlight(entry.node, entry.fileIndex),
    );
  }, [highlightedEntries]);

  const canonicalMoveSourceHighlights = useMemo(
    () =>
      (data?.move_source_highlights ?? []).map(
        convertMoveSourceHighlightToSelectionHighlight,
      ),
    [data?.move_source_highlights],
  );

  const sourceHighlightedSpansByFileIndex = useMemo(() => {
    const next = new Map<number, SrcDiffHighlight[]>();

    const sourceHighlights =
      highlightMode === "all-moves"
        ? canonicalMoveSourceHighlights
        : highlightMode === "selection" &&
            selectedNodeEntry?.node.kind === "move" &&
            selectedMoveId
          ? canonicalMoveSourceHighlights.filter(
              (highlight) => highlight.moveId === selectedMoveId,
            )
          : highlightedEntries.map(([, entry]) => ({
              moveId: entry.node.move_id ?? entry.node.id,
              fileIndex: entry.fileIndex,
              value: getNodeHighlight(entry.node, entry.fileIndex),
            }));

    for (const highlight of sourceHighlights) {
      const fileHighlights = next.get(highlight.fileIndex) ?? [];
      fileHighlights.push(highlight.value);
      next.set(highlight.fileIndex, fileHighlights);
    }

    return next;
  }, [
    canonicalMoveSourceHighlights,
    highlightMode,
    highlightedEntries,
    selectedMoveId,
    selectedNodeEntry,
  ]);

  useEffect(() => {
    setSelectedFileIndexState(0);
    setSelectedNodeIdState(null);
    setHighlightMode("selection");
    setSuppressedHighlightedNodeIds(new Set());
  }, [data]);

  useEffect(() => {
    if (!data) return;

    if (selectedFileIndex >= data.files.length) {
      setSelectedFileIndexState(0);
    }
  }, [data, selectedFileIndex]);

  useEffect(() => {
    if (!selectedNodeId) return;

    if (!treeIndex.has(selectedNodeId)) {
      setSelectedNodeIdState(null);
    }
  }, [selectedNodeId, treeIndex]);

  function setSelectedFileIndex(index: number) {
    setSelectedFileIndexState(index);
  }

  function setSelectedNodeId(nodeId: string) {
    setHighlightMode("selection");
    setSuppressedHighlightedNodeIds(new Set());
    setSelectedNodeIdState(nodeId);

    const entry = treeIndex.get(nodeId);
    if (entry) {
      setSelectedFileIndexState(entry.fileIndex);
    }
  }

  function highlightAllMoves() {
    highlightAllByKind("move", "all-moves");
  }

  function highlightAllInserts() {
    highlightAllByKind("insert", "all-inserts");
  }

  function highlightAllDeletes() {
    highlightAllByKind("delete", "all-deletes");
  }

  function highlightAllByKind(kind: HighlightKind, mode: HighlightMode) {
    setHighlightMode(mode);
    setSuppressedHighlightedNodeIds(new Set());

    const firstMatchingEntry = treeEntries.find(
      ([, entry]) => entry.node.kind === kind,
    );

    if (!firstMatchingEntry) {
      setSelectedNodeIdState(null);
      return;
    }

    const [firstMatchingNodeId, firstMatchingEntryValue] = firstMatchingEntry;

    setSelectedNodeIdState(firstMatchingNodeId);
    setSelectedFileIndexState(firstMatchingEntryValue.fileIndex);
  }

  function clearHighlights() {
    setHighlightMode("selection");
    setSuppressedHighlightedNodeIds(new Set());
    setSelectedNodeIdState(null);
  }

  function unhighlightNode(nodeId: string) {
    setSuppressedHighlightedNodeIds((current) => {
      const next = new Set(current);
      next.add(nodeId);
      return next;
    });
  }

  return {
    moveNodesById,
    selectedMoveId,
    selectedFile,
    selectedFileIndex,
    selectedNode,
    selectedNodeId,
    selectedNodeFileIndex,
    selectedSpans,
    highlightedNodes,
    highlightedNodeIds,
    highlightedSpans,
    sourceHighlightedSpansByFileIndex,
    highlightMode,
    unhighlightNode,
    setSelectedFileIndex,
    setSelectedNodeId,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
  };
}

function convertMoveSourceHighlightToSelectionHighlight(
  highlight: MoveSourceHighlight,
): {
  moveId: string;
  fileIndex: number;
  value: SrcDiffHighlight;
} {
  return (
    highlight.revision === "revision_0"
      ? {
          moveId: highlight.move_id,
          fileIndex: highlight.unit_id - 1,
          value: {
            nodeId: highlight.path,
            fileIndex: highlight.unit_id - 1,
            kind: "move",
            xmlSpan: null,
            revision0Span: highlight.span,
            revision1Span: null,
          },
        }
      : {
          moveId: highlight.move_id,
          fileIndex: highlight.unit_id - 1,
          value: {
            nodeId: highlight.path,
            fileIndex: highlight.unit_id - 1,
            kind: "move",
            xmlSpan: null,
            revision0Span: null,
            revision1Span: highlight.span,
          },
        }
  );
}
