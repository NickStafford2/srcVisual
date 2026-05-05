import type { FormEvent } from "react";
import {
  DELETE_INSERT_SAMPLE,
  NESTED_SAMPLE,
  SIMPLE_MOVE_SAMPLE,
} from "../../samples";
import type { VisualizeResponse } from "../../types";
import { SampleButton } from "./SampleButton";
import { StatusPill } from "./StatusPill";

type InputPanelProps = {
  selectedUpload: File | null;
  xmlInput: string;
  isLoading: boolean;
  error: string | null;
  progressMessage: string | null;
  data: VisualizeResponse | null;
  includeSkippedTags: boolean;
  onUploadChange: (file: File | null) => void;
  onXmlInputChange: (value: string) => void;
  onIncludeSkippedTagsChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InputPanel({
  selectedUpload,
  xmlInput,
  isLoading,
  error,
  progressMessage,
  data,
  includeSkippedTags,
  onUploadChange,
  onXmlInputChange,
  onIncludeSkippedTagsChange,
  onSubmit,
}: InputPanelProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <form onSubmit={onSubmit}>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              srcDiff Input
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-300">
              Choose a srcdiff XML file or paste raw XML. The backend is the
              source of truth.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-sky-300/10">
              <input
                className="hidden"
                type="file"
                accept=".xml,.srcdiff"
                onChange={(event) =>
                  onUploadChange(event.target.files?.[0] ?? null)
                }
              />

              <span>{selectedUpload?.name ?? "Choose srcdiff file"}</span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl border border-sky-300/30 bg-green-900 px-3 py-2 text-sm font-medium text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? "Converting..." : "Visualize"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <SampleButton onClick={() => onXmlInputChange(NESTED_SAMPLE)}>
            Load nested sample
          </SampleButton>

          <SampleButton onClick={() => onXmlInputChange(SIMPLE_MOVE_SAMPLE)}>
            Load move sample
          </SampleButton>

          <SampleButton onClick={() => onXmlInputChange(DELETE_INSERT_SAMPLE)}>
            Load rename sample
          </SampleButton>
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.05]">
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

        <textarea
          className="mt-3 min-h-[140px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm leading-5 text-slate-100 transition outline-none placeholder:text-slate-500 focus:border-sky-300/40"
          spellCheck={false}
          value={xmlInput}
          onChange={(event) => onXmlInputChange(event.target.value)}
          placeholder="Paste srcdiff XML here"
        />
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
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
    </section>
  );
}
