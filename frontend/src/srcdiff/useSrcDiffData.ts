import { useState } from "react";
import type { FormEvent } from "react";
import { openVisualizationProgressStream, visualizeSrcDiff } from "../api";
import { NESTED_SAMPLE } from "../samples";
import type { VisualizeResponse } from "../types";

export function useSrcDiffData() {
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [xmlInput, setXmlInput] = useState(NESTED_SAMPLE);
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeSkippedTags, setIncludeSkippedTags] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  function handleXmlInputChange(value: string) {
    setXmlInput(value);
    setSelectedUpload(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    formData.append(
      "include_skipped_tags",
      includeSkippedTags ? "true" : "false",
    );

    const progressToken = crypto.randomUUID();
    formData.append("progress_token", progressToken);

    const progressStream = openVisualizationProgressStream(
      progressToken,
      (event) => {
        setProgressMessage(event.message);
      },
    );

    setIsLoading(true);
    setError(null);
    setProgressMessage("Connecting to backend progress stream.");

    try {
      const payload = await visualizeSrcDiff(formData);
      setData(payload);
      setProgressMessage("Visualization complete.");
    } catch (submissionError) {
      setData(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to visualize the uploaded srcdiff.",
      );
      setProgressMessage(null);
    } finally {
      setIsLoading(false);
      progressStream.close();
    }
  }

  return {
    selectedUpload,
    xmlInput,
    data,
    isLoading,
    error,
    progressMessage,
    includeSkippedTags,
    setSelectedUpload,
    setIncludeSkippedTags,
    handleXmlInputChange,
    handleSubmit,
  };
}
