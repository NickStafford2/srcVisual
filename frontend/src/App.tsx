import { useEffect, useMemo, useState } from "react";
import { visualizeSrcDiff } from "./api";
import { Hero } from "./components/Hero";
import { InputPanel } from "./components/InputPanel";
import { SourceSection } from "./components/SourceSection";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { NESTED_SAMPLE } from "./samples";
import { buildSourceView, findTreeNodeById } from "./srcdiff";
import type { VisualizeResponse } from "./types";

export default function App() {
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [xmlInput, setXmlInput] = useState(NESTED_SAMPLE);
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFile = data?.files[selectedFileIndex] ?? null;

  const selectedNode = useMemo(
    () => findTreeNodeById(selectedFile?.tree, selectedNodeId),
    [selectedFile?.tree, selectedNodeId],
  );

  const beforeLines = useMemo(
    () =>
      buildSourceView(
        selectedFile?.before_source ?? "",
        selectedNode?.before_span,
        selectedNode?.kind ?? "plain",
      ),
    [
      selectedFile?.before_source,
      selectedNode?.before_span,
      selectedNode?.kind,
    ],
  );

  const afterLines = useMemo(
    () =>
      buildSourceView(
        selectedFile?.after_source ?? "",
        selectedNode?.after_span,
        selectedNode?.kind ?? "plain",
      ),
    [selectedFile?.after_source, selectedNode?.after_span, selectedNode?.kind],
  );

  useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedFile?.tree]);

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

  function handleXmlInputChange(value: string) {
    setXmlInput(value);
    setSelectedUpload(null);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(93,135,255,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(104,224,168,0.16),transparent_28%),linear-gradient(180deg,#09111b_0%,#101826_100%)] px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <Hero />

        <InputPanel
          selectedUpload={selectedUpload}
          xmlInput={xmlInput}
          isLoading={isLoading}
          error={error}
          data={data}
          selectedFileIndex={selectedFileIndex}
          onUploadChange={setSelectedUpload}
          onXmlInputChange={handleXmlInputChange}
          onSubmit={handleSubmit}
          onSelectFileIndex={setSelectedFileIndex}
        />

        <SrcDiffTree
          root={selectedFile?.tree ?? null}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />

        <SourceSection
          filename={selectedFile?.filename ?? null}
          selectedNode={selectedNode}
          beforeLines={beforeLines}
          afterLines={afterLines}
        />
      </div>
    </main>
  );
}
