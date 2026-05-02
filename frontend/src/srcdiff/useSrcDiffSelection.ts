import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse } from "../types";
import { buildTreeIndex } from "./treeIndex";

export function useSrcDiffSelection(data: VisualizeResponse | null) {
  const [selectedFileIndex, setSelectedFileIndexState] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
    setSelectedNodeId(null);
  }, [data]);

  useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedFile?.tree]);

  function setSelectedFileIndex(index: number) {
    setSelectedFileIndexState(index);
    setSelectedNodeId(null);
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
