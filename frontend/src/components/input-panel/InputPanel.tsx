import type { FormEvent } from "react";
import type { InputMode, ProgressLogEntry } from "../../srcdiff/useSrcDiffData";
import type { ArtifactManifest } from "../../types";
import { ExampleInput } from "./ExampleInput";
import { InputModeToggle } from "./InputModeToggle";
import { InputPanelSubmitRow } from "./InputPanelSubmitRow";
import { PasteXmlInput } from "./PasteXmlInput";
import { ProgressLog } from "./ProgressLog";
import { UploadFileInput } from "./UploadFileInput";
import { HistoryInput } from "./HistoryInput";
import type { ReturnTypeOfUseHistoryData } from "./historyInputTypes";

type InputPanelProps = {
  inputMode: InputMode;
  selectedUpload: File | null;
  xmlInput: string;
  loadedExampleFilename: string | null;
  isLoading: boolean;
  error: string | null;
  progressMessage: string | null;
  progressMessages: ProgressLogEntry[];
  data: ArtifactManifest | null;
  exampleFilenames: string[];
  examplesError: string | null;
  isLoadingExample: boolean;
  history: ReturnTypeOfUseHistoryData;
  onInputModeChange: (mode: InputMode) => void;
  onLoadExample: (filename: string) => void;
  onUploadChange: (file: File | null) => void;
  onXmlInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InputPanel({
  inputMode,
  selectedUpload,
  xmlInput,
  loadedExampleFilename,
  isLoading,
  error,
  progressMessage,
  progressMessages,
  data,
  exampleFilenames,
  examplesError,
  isLoadingExample,
  history,
  onInputModeChange,
  onLoadExample,
  onUploadChange,
  onXmlInputChange,
  onSubmit,
}: InputPanelProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <InputModeToggle
          mode={inputMode}
          disabled={isLoading}
          onChange={onInputModeChange}
        />

        {inputMode === "history" ? <HistoryInput {...history} /> : null}

        {inputMode === "examples" ? (
          <ExampleInput
            exampleFilenames={exampleFilenames}
            examplesError={examplesError}
            isLoadingExample={isLoadingExample}
            disabled={isLoading}
            loadedExampleFilename={loadedExampleFilename}
            onLoadExample={onLoadExample}
          />
        ) : null}

        {inputMode === "paste" ? (
          <PasteXmlInput
            xmlInput={xmlInput}
            disabled={isLoading}
            onXmlInputChange={onXmlInputChange}
          />
        ) : null}

        {inputMode === "upload" ? (
          <UploadFileInput
            selectedUpload={selectedUpload}
            disabled={isLoading}
            onUploadChange={onUploadChange}
          />
        ) : null}

        {inputMode !== "history" ? (
          <>
            <InputPanelSubmitRow
              isLoading={isLoading}
              error={error}
              progressMessage={progressMessage}
              data={data}
            />

            <ProgressLog entries={progressMessages} />
          </>
        ) : null}
      </form>
    </section>
  );
}
