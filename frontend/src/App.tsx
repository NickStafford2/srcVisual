import { useMemo, useState } from "react";
import {
  DELETE_INSERT_SAMPLE,
  NESTED_SAMPLE,
  SIMPLE_MOVE_SAMPLE,
} from "./samples";
import type { HighlightKind, ViewerLine } from "./srcdiff";
import { alignSources } from "./srcdiff";

interface VisualizedFile {
  unit: number;
  filename: string;
  language?: string;
  before_source: string;
  after_source: string;
}

interface VisualizeResponse {
  source_filename: string;
  annotated_srcdiff_xml: string;
  units: string;
  files: VisualizedFile[];
}

export default function App() {
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [xmlInput, setXmlInput] = useState(NESTED_SAMPLE);
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFile = data?.files[selectedFileIndex] ?? null;
  const aligned = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return alignSources(selectedFile.before_source, selectedFile.after_source);
  }, [selectedFile]);

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
      const response = await fetch("/api/visualize", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | VisualizeResponse
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      setData(payload);
      setSelectedFileIndex(0);
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(93,135,255,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(104,224,168,0.16),transparent_28%),linear-gradient(180deg,#09111b_0%,#101826_100%)] px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="grid gap-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-sky-300">
                srcVisual / srcMove / srcDiff
              </p>
              <h1 className="max-w-[12ch] text-4xl leading-none font-semibold sm:text-5xl lg:text-7xl">
                Upload a srcDiff file and let the backend reconstruct both
                revisions.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                The Flask backend runs the command-line tools on your PATH, uses
                srcMove to annotate the diff, extracts revision 0 and revision 1
                with archive_reader, and sends the source code back for display.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LegendChip tone="amber">Before only</LegendChip>
              <LegendChip tone="sky">After only</LegendChip>
              <LegendChip tone="emerald">Changed line</LegendChip>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <h2 className="text-2xl font-semibold text-slate-50">
                  srcDiff input
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
                      setSelectedUpload(event.target.files?.[0] ?? null)
                    }
                  />
                  <span>{selectedUpload?.name ?? "Choose srcdiff file"}</span>
                </label>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm font-medium text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isLoading ? "Converting..." : "Visualize"}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <SampleButton
                onClick={() => {
                  setSelectedUpload(null);
                  setXmlInput(NESTED_SAMPLE);
                }}
              >
                Load nested sample
              </SampleButton>
              <SampleButton
                onClick={() => {
                  setSelectedUpload(null);
                  setXmlInput(SIMPLE_MOVE_SAMPLE);
                }}
              >
                Load move sample
              </SampleButton>
              <SampleButton
                onClick={() => {
                  setSelectedUpload(null);
                  setXmlInput(DELETE_INSERT_SAMPLE);
                }}
              >
                Load rename sample
              </SampleButton>
            </div>

            <textarea
              className="mt-5 min-h-[280px] w-full resize-y rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-[0.95rem] leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/40"
              spellCheck={false}
              value={xmlInput}
              onChange={(event) => {
                setXmlInput(event.target.value);
                setSelectedUpload(null);
              }}
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
              <span className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-300">
                {data.units} unit(s) extracted
              </span>
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
                  onClick={() => setSelectedFileIndex(index)}
                >
                  {file.filename}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ViewerPane
            title="Original before"
            subtitle={
              selectedFile
                ? `${selectedFile.filename} revision 0`
                : "Upload a file to begin"
            }
            lines={aligned?.beforeLines ?? []}
          />
          <ViewerPane
            title="Original after"
            subtitle={
              selectedFile
                ? `${selectedFile.filename} revision 1`
                : "Upload a file to begin"
            }
            lines={aligned?.afterLines ?? []}
          />
        </section>
      </div>
    </main>
  );
}

function ViewerPane({
  title,
  subtitle,
  lines,
}: {
  title: string;
  subtitle: string;
  lines: ViewerLine[];
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/65 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="px-6 pt-6 pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
        </div>
      </header>
      <div
        className="max-h-[72vh] overflow-auto border-t border-white/10 bg-slate-950/85 font-mono"
        role="region"
        aria-label={title}
      >
        {lines.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-400">
            No code to render yet.
          </div>
        ) : (
          lines.map((line, index) => (
            <div
              key={`${title}-${index}`}
              className={[
                "grid grid-cols-[72px_1fr] gap-3 px-5",
                line.hasHighlight ? "bg-white/[0.04]" : "",
              ].join(" ")}
            >
              <span className="select-none border-r border-white/5 py-2 pr-3 text-right text-sm text-slate-500">
                {line.number > 0 ? line.number : ""}
              </span>
              <span className="block py-2 text-sm whitespace-pre-wrap break-words text-slate-100">
                <span className={segmentClasses(line.kind)}>
                  {line.text || " "}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function LegendChip({
  children,
  tone,
}: {
  children: string;
  tone: "amber" | "sky" | "emerald";
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-200/15 bg-amber-300/20"
      : tone === "sky"
        ? "border-sky-200/15 bg-sky-300/20"
        : "border-emerald-200/15 bg-emerald-300/20";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-2 text-sm ${toneClasses}`}
    >
      {children}
    </span>
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

function segmentClasses(kind: HighlightKind): string {
  switch (kind) {
    case "delete":
      return "rounded-md bg-amber-300/25";
    case "insert":
      return "rounded-md bg-sky-300/25";
    case "move":
      return "rounded-md bg-emerald-300/25";
    default:
      return "";
  }
}
