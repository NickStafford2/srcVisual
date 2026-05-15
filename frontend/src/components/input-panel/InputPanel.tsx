import { useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type {
  InputMode,
  ProgressLogEntry,
} from "../../srcdiff/useSrcDiffData";
import type { TreePruningLevel, VisualizeResponse } from "../../types";
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
  const progressLogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!progressLogRef.current) {
      return;
    }

    progressLogRef.current.scrollTop = progressLogRef.current.scrollHeight;
  }, [progressMessages]);

  function formatElapsedTime(elapsedMs: number): string {
    return `${(elapsedMs / 1000).toFixed(2)}s`;
  }

  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-slate-50">
          srcDiff Visualizer
        </h2>

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

        <label className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
          <span className="font-medium text-slate-100">Pruning mode</span>

          <span className="text-xs leading-5 text-slate-400">
            Choose how aggressively the backend removes non-target files, XML
            tags, tree branches, and source code before the payload is built.
          </span>

          <select
            value={pruningLevel}
            disabled={isLoading}
            onChange={(event) =>
              onPruningLevelChange(event.target.value as TreePruningLevel)
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/40"
            aria-label="Pruning mode"
          >
            <option value="none">
              No pruning: keep all files and full trees
            </option>
            <option value="file-and-tree">
              Changed branches: keep only changed files and changed XML/tree/source branches
            </option>
            <option value="file-only">
              Changed files: keep only files with any diff, but preserve full file contents
            </option>
            <option value="move-only">
              Move branches: keep only files with moves and prune everything else away
            </option>
          </select>
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
                  : "Waiting for input"}
          </StatusPill>
        </div>

        <section className="rounded-xl border border-emerald-400/20 bg-slate-950/90 shadow-inner shadow-black/30">
          <header className="flex items-center justify-between border-b border-emerald-400/15 px-3 py-2">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
              Progress Log
            </h3>

            <span className="font-mono text-[11px] text-slate-500">
              {progressMessages.length} line{progressMessages.length === 1 ? "" : "s"}
            </span>
          </header>

          <div
            ref={progressLogRef}
            aria-label="Visualization progress log"
            className="max-h-64 overflow-y-auto px-3 py-3 font-mono text-xs leading-6 text-emerald-100"
          >
            {progressMessages.length > 0 ? (
              progressMessages.map((entry, index) => (
                <div
                  key={`${index}:${entry.message}:${entry.elapsedMs}`}
                  className="flex gap-3 border-l border-emerald-400/15 pl-3 whitespace-pre-wrap break-words"
                >
                  <span className="select-none text-emerald-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">{entry.message}</span>
                  <span className="shrink-0 text-emerald-500/80">
                    [{formatElapsedTime(entry.elapsedMs)}]
                  </span>
                </div>
              ))
            ) : (
              <div className="border-l border-emerald-400/15 pl-3 text-slate-500">
                No progress messages yet.
              </div>
            )}
          </div>
        </section>
      </form>
    </section>
  );
}
