import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse, VisualizedFile } from "../types";
import type { SrcDiffTreeNode } from "./types";
import { buildTreeIndex } from "./treeIndex";

export type SrcDiffSelectionState = {
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  setSelectedFileIndex: (index: number) => void;
  setSelectedNodeId: (nodeId: string) => void;
};

export function useSrcDiffSelection(
  data: VisualizeResponse | null,
): SrcDiffSelectionState {
  const [selectedFileIndex, setSelectedFileIndexState] = useState(0);
  const [selectedNodeId, setSelectedNodeIdState] = useState<string | null>(
    null,
  );

  const selectedFile = data?.files[selectedFileIndex] ?? null;

  const treeIndex = useMemo(
    () => buildTreeIndex(selectedFile?.tree ?? null),
    [selectedFile?.tree],
  );

  const selectedNode = selectedNodeId
    ? (treeIndex.get(selectedNodeId) ?? null)
    : null;

  useEffect(() => {
    setSelectedFileIndexState(0);
    setSelectedNodeIdState(null);
  }, [data]);

  useEffect(() => {
    if (!data) return;

    if (selectedFileIndex >= data.files.length) {
      setSelectedFileIndexState(0);
      setSelectedNodeIdState(null);
    }
  }, [data, selectedFileIndex]);

  useEffect(() => {
    setSelectedNodeIdState(null);
  }, [selectedFile?.tree]);

  function setSelectedFileIndex(index: number) {
    setSelectedFileIndexState(index);
    setSelectedNodeIdState(null);
  }

  function setSelectedNodeId(nodeId: string) {
    setSelectedNodeIdState(nodeId);
  }

  return {
    selectedFile,
    selectedFileIndex,
    selectedNode,
    selectedNodeId,
    setSelectedFileIndex,
    setSelectedNodeId,
  };
}
