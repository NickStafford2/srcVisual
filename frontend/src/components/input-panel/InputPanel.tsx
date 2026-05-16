import type { FormEvent } from "react";
import type { InputMode, ProgressLogEntry } from "../../srcdiff/useSrcDiffData";
import type { TreePruningLevel, VisualizeResponse } from "../../types";
import { InputModeToggle } from "./InputModeToggle";
import { InputPanelOptions } from "./InputPanelOptions";
import { InputPanelSubmitRow } from "./InputPanelSubmitRow";
import { PasteXmlInput } from "./PasteXmlInput";
import { ProgressLog } from "./ProgressLog";
import { UploadFileInput } from "./UploadFileInput";

type InputPanelProps = {
  inputMode: InputMode;
  selectedUpload: File | null;
  xmlInput: string;
  isLoading: boolean;
  error: string | null;
  progressMessage: string | null;
  progressMessages: ProgressLogEntry[];
  data: VisualizeResponse | null;
  includeSkippedTags: boolean;
  pruningLevel: TreePruningLevel;
  exampleFilenames: string[];
  examplesError: string | null;
  isLoadingExample: boolean;
  onInputModeChange: (mode: InputMode) => void;
  onLoadExample: (filename: string) => void;
  onUploadChange: (file: File | null) => void;
  onXmlInputChange: (value: string) => void;
  onIncludeSkippedTagsChange: (value: boolean) => void;
  onPruningLevelChange: (value: TreePruningLevel) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InputPanel({
  inputMode,
  selectedUpload,
  xmlInput,
  isLoading,
  error,
  progressMessage,
  progressMessages,
  data,
  includeSkippedTags,
  pruningLevel,
  exampleFilenames,
  examplesError,
  isLoadingExample,
  onInputModeChange,
  onLoadExample,
  onUploadChange,
  onXmlInputChange,
  onIncludeSkippedTagsChange,
  onPruningLevelChange,
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

        {inputMode === "paste" ? (
          <PasteXmlInput
            exampleFilenames={exampleFilenames}
            examplesError={examplesError}
            isLoadingExample={isLoadingExample}
            xmlInput={xmlInput}
            disabled={isLoading}
            onLoadExample={onLoadExample}
            onXmlInputChange={onXmlInputChange}
          />
        ) : (
          <UploadFileInput
            selectedUpload={selectedUpload}
            disabled={isLoading}
            onUploadChange={onUploadChange}
          />
        )}

        <InputPanelOptions
          includeSkippedTags={includeSkippedTags}
          pruningLevel={pruningLevel}
          disabled={isLoading}
          onIncludeSkippedTagsChange={onIncludeSkippedTagsChange}
          onPruningLevelChange={onPruningLevelChange}
        />

        <InputPanelSubmitRow
          isLoading={isLoading}
          error={error}
          progressMessage={progressMessage}
          data={data}
        />

        <ProgressLog entries={progressMessages} />
      </form>
    </section>
  );
}
