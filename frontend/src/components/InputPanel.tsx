import {
  DELETE_INSERT_SAMPLE,
  NESTED_SAMPLE,
  SIMPLE_MOVE_SAMPLE,
} from "../samples";
import type { VisualizeResponse } from "../types";

type InputPanelProps = {
  selectedUpload: File | null;
  xmlInput: string;
  isLoading: boolean;
  error: string | null;
  data: VisualizeResponse | null;
  selectedFileIndex: number;
  onUploadChange: (file: File | null) => void;
  onXmlInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectFileIndex: (index: number) => void;
};

export function InputPanel({
  selectedUpload,
  xmlInput,
  isLoading,
  error,
  data,
  selectedFileIndex,
  onUploadChange,
  onXmlInputChange,
  onSubmit,
  onSelectFileIndex,
}: InputPanelProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <form onSubmit={onSubmit}>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">
              srcDiff Input
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Choose a srcdiff XML file or paste raw XML. The backend is the
              source of truth.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-sky-300/10">
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
              className="rounded-2xl border border-sky-300/30 bg-green-900 px-4 py-3 text-sm font-medium text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? "Converting..." : "Visualize"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
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

        <textarea
          className="mt-5 min-h-[220px] w-full resize-y rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-[0.95rem] leading-6 text-slate-100 transition outline-none placeholder:text-slate-500 focus:border-sky-300/40"
          spellCheck={false}
          value={xmlInput}
          onChange={(event) => onXmlInputChange(event.target.value)}
          placeholder="Paste srcdiff XML here"
        />
      </form>

      <div className="mt-4 flex flex-wrap gap-3">
        <StatusPill error={error}>
          {error
            ? error
            : data
              ? `Loaded ${data.files.length} file${data.files.length === 1 ? "" : "s"} from ${data.source_filename}`
              : "Waiting for upload"}
        </StatusPill>

        {data ? (
          <>
            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-300">
              {data.units} unit(s) extracted
            </span>
            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-300">
              {data.has_position_data
                ? "position-aware highlights enabled"
                : "no position spans detected"}
            </span>
          </>
        ) : null}
      </div>

      {data ? (
        <div
          className="mt-5 flex flex-wrap gap-3"
          role="tablist"
          aria-label="Archive files"
        >
          {data.files.map((file, index) => (
            <button
              key={`${file.unit}-${file.filename}`}
              type="button"
              className={[
                "cursor-pointer rounded-full border px-4 py-2.5 text-sm transition",
                index === selectedFileIndex
                  ? "border-sky-300/30 bg-sky-300/15 text-slate-50"
                  : "border-white/8 bg-white/5 text-slate-300 hover:border-sky-300/20 hover:bg-sky-300/8",
              ].join(" ")}
              onClick={() => onSelectFileIndex(index)}
            >
              {file.filename}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SampleButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-2.5 text-sm text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20"
    >
      {children}
    </button>
  );
}

function StatusPill({
  children,
  error,
}: {
  children: string;
  error: string | null;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-2 text-sm",
        error
          ? "border-red-300/10 bg-red-300/10 text-red-200"
          : "border-emerald-300/10 bg-emerald-300/10 text-emerald-200",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
