import { useEffect, useMemo, useState } from "react";
import { visualizeSrcDiff } from "../api";
import { NESTED_SAMPLE } from "../samples";
import type { VisualizeResponse } from "../types";
import { buildInteractiveSourceView } from "./srcView";
import { buildTreeIndex } from "./treeIndex";

export function useSrcDiffVisualizer() {
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [xmlInput, setXmlInput] = useState(NESTED_SAMPLE);
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFile = data?.files[selectedFileIndex] ?? null;

  const treeIndex = useMemo(
    () => buildTreeIndex(selectedFile?.tree ?? null),
    [selectedFile?.tree],
  );

  const selectedNode = selectedNodeId
    ? (treeIndex.get(selectedNodeId) ?? null)
    : null;

  const xmlLines = useMemo(
    () =>
      buildInteractiveSourceView({
        source: data?.annotated_srcdiff_xml ?? xmlInput,
        root: selectedFile?.tree ?? null,
        selectedNodeId,
        getSpan: (node) => node.xml_span,
      }),
    [data?.annotated_srcdiff_xml, xmlInput, selectedFile?.tree, selectedNodeId],
  );

  const beforeLines = useMemo(
    () =>
      buildInteractiveSourceView({
        source: selectedFile?.before_source ?? "",
        root: selectedFile?.tree ?? null,
        selectedNodeId,
        getSpan: (node) => node.before_span,
      }),
    [selectedFile?.before_source, selectedFile?.tree, selectedNodeId],
  );

  const afterLines = useMemo(
    () =>
      buildInteractiveSourceView({
        source: selectedFile?.after_source ?? "",
        root: selectedFile?.tree ?? null,
        selectedNodeId,
        getSpan: (node) => node.after_span,
      }),
    [selectedFile?.after_source, selectedFile?.tree, selectedNodeId],
  );

  useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedFile?.tree]);

  function handleXmlInputChange(value: string) {
    setXmlInput(value);
    setSelectedUpload(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUpload && !xmlInput.trim()) {
      setError("Choose a srcdiff file or paste srcdiff XML first.");
      return;
    }

    const formData = new FormData();

    if (selectedUpload) {
      formData.append("srcdiff", selectedUpload);
    } else {
      formData.append("srcdiff_xml", xmlInput);
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = await visualizeSrcDiff(formData);
      setData(payload);
      setSelectedFileIndex(0);
      setSelectedNodeId(null);
    } catch (submissionError) {
      setData(null);
      setSelectedNodeId(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to visualize the uploaded srcdiff.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    selectedUpload,
    xmlInput,
    data,
    selectedFile,
    selectedFileIndex,
    selectedNode,
    selectedNodeId,
    xmlLines,
    beforeLines,
    afterLines,
    isLoading,
    error,
    setSelectedUpload,
    setSelectedFileIndex,
    setSelectedNodeId,
    handleXmlInputChange,
    handleSubmit,
  };
}
