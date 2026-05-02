import { useState } from "react";
import type { FormEvent } from "react";
import { visualizeSrcDiff } from "../api";
import { NESTED_SAMPLE } from "../samples";
import type { VisualizeResponse } from "../types";

export function useSrcDiffData() {
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [xmlInput, setXmlInput] = useState(NESTED_SAMPLE);
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsLoading(true);
    setError(null);

    try {
      const payload = await visualizeSrcDiff(formData);
      setData(payload);
    } catch (submissionError) {
      setData(null);
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
    isLoading,
    error,
    setSelectedUpload,
    handleXmlInputChange,
    handleSubmit,
  };
}
