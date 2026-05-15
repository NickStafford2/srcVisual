import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  fetchExampleContent,
  fetchExampleList,
  openVisualizationProgressStream,
  visualizeSrcDiff,
} from "../api";
import type { TreePruningLevel, VisualizeResponse } from "../types";

export type InputMode = "paste" | "upload";

export function useSrcDiffData() {
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [xmlInput, setXmlInput] = useState("");
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeSkippedTags, setIncludeSkippedTags] = useState(false);
  const [pruningLevel, setPruningLevel] =
    useState<TreePruningLevel>("file-and-tree");
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [exampleFilenames, setExampleFilenames] = useState<string[]>([]);
  const [examplesError, setExamplesError] = useState<string | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadExamples() {
      try {
        const filenames = await fetchExampleList();
        if (!isActive) return;

        setExampleFilenames(filenames);
        setExamplesError(null);
      } catch (loadError) {
        if (!isActive) return;

        setExamplesError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load examples.",
        );
      }
    }

    void loadExamples();

    return () => {
      isActive = false;
    };
  }, []);

  function handleXmlInputChange(value: string) {
    setXmlInput(value);
  }

  function handleInputModeChange(mode: InputMode) {
    setInputMode(mode);
  }

  function handleUploadChange(file: File | null) {
    setSelectedUpload(file);

    if (file) {
      setInputMode("upload");
    }
  }

  async function handleLoadExample(filename: string) {
    setIsLoadingExample(true);
    setError(null);

    try {
      const content = await fetchExampleContent(filename);
      setXmlInput(content);
      setInputMode("paste");
      setExamplesError(null);
    } catch (loadError) {
      setExamplesError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load example content.",
      );
    } finally {
      setIsLoadingExample(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inputMode === "upload" && !selectedUpload) {
      setError("Choose a srcDiff file before submitting.");
      return;
    }

    if (inputMode === "paste" && !xmlInput.trim()) {
      setError("Paste srcdiff XML or load an example before submitting.");
      return;
    }

    const formData = new FormData();

    if (inputMode === "upload" && selectedUpload) {
      formData.append("srcdiff", selectedUpload);
    } else {
      formData.append("srcdiff_xml", xmlInput);
    }

    formData.append(
      "include_skipped_tags",
      includeSkippedTags ? "true" : "false",
    );
    formData.append("pruning_level", pruningLevel);

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
    inputMode,
    selectedUpload,
    xmlInput,
    data,
    isLoading,
    error,
    progressMessage,
    includeSkippedTags,
    pruningLevel,
    exampleFilenames,
    examplesError,
    isLoadingExample,
    setInputMode: handleInputModeChange,
    setIncludeSkippedTags,
    setPruningLevel,
    setSelectedUpload: handleUploadChange,
    handleXmlInputChange,
    handleLoadExample,
    handleSubmit,
  };
}
