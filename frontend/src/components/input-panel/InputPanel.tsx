import type { FormEvent } from "react";
import type { InputMode } from "../../srcdiff/useSrcDiffData";
import type { VisualizeResponse } from "../../types";
import { InputModeToggle } from "./InputModeToggle";
import { PasteXmlInput } from "./PasteXmlInput";
import { StatusPill } from "./StatusPill";
import { UploadFileInput } from "./UploadFileInput";

type InputPanelProps = {
  inputMode: InputMode;
  selectedUpload: File | null;
  xmlInput: string;
  isLoading: boolean;
  error: string | null;
  progressMessage: string | null;
  data: VisualizeResponse | null;
  includeSkippedTags: boolean;
  onInputModeChange: (mode: InputMode) => void;
  onUploadChange: (file: File | null) => void;
  onXmlInputChange: (value: string) => void;
  onIncludeSkippedTagsChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InputPanel({
  inputMode,
  selectedUpload,
  xmlInput,
  isLoading,
  error,
  progressMessage,
  data,
  includeSkippedTags,
  onInputModeChange,
  onUploadChange,
  onXmlInputChange,
  onIncludeSkippedTagsChange,
  onSubmit,
}: InputPanelProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <h2 className="text-xl font-semibold text-slate-50">srcDiff Input</h2>

          <p className="mt-1 text-sm leading-5 text-slate-300">
            Pick one input path, then send that srcdiff data to the backend.
          </p>
        </div>

        <InputModeToggle
          mode={inputMode}
          disabled={isLoading}
          onChange={onInputModeChange}
        />

        {inputMode === "paste" ? (
          <PasteXmlInput
            xmlInput={xmlInput}
            disabled={isLoading}
            onXmlInputChange={onXmlInputChange}
          />
        ) : (
          <UploadFileInput
            selectedUpload={selectedUpload}
            disabled={isLoading}
            onUploadChange={onUploadChange}
          />
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.05]">
          <input
            type="checkbox"
            checked={includeSkippedTags}
            onChange={(event) =>
              onIncludeSkippedTagsChange(event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
          />

          <span>
            <span className="block font-medium text-slate-100">
              Show every XML tag
            </span>

            <span className="block text-xs leading-5 text-slate-400">
              Includes tags normally hidden from the Units tree, such as
              diff:ws.
            </span>
          </span>
        </label>

        <div className="flex flex-row gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl border border-sky-300/30 bg-green-900 px-4 py-2 text-sm font-medium text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isLoading ? "Submitting..." : "Submit"}
          </button>

          <StatusPill error={error}>
            {error
              ? error
              : isLoading && progressMessage
                ? progressMessage
                : data
                  ? `Loaded ${data.files.length} file${data.files.length === 1 ? "" : "s"} from ${data.source_filename}`
                  : "Waiting for upload"}
          </StatusPill>
        </div>
      </form>
    </section>
  );
}
