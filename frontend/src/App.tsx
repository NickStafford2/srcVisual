import { useMemo, useState } from "react";
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

    if (!selectedUpload) {
      setError("Choose a srcdiff XML file first.");
      return;
    }

    const formData = new FormData();
    formData.append("srcdiff", selectedUpload);

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/visualize", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as VisualizeResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      setData(payload);
      setSelectedFileIndex(0);
    } catch (submissionError) {
      setData(null);
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to visualize the uploaded srcdiff.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">srcVisual / srcMove / srcDiff</p>
          <h1>Upload a srcDiff file and let the backend reconstruct both revisions.</h1>
          <p className="hero-copy">
            The Flask backend runs the command-line tools on your PATH, uses srcMove to annotate
            the diff, extracts revision 0 and revision 1 with archive_reader, and sends the source
            code back for display.
          </p>
        </div>
        <div className="legend">
          <span className="chip chip-delete">Before only</span>
          <span className="chip chip-insert">After only</span>
          <span className="chip chip-move">Changed line</span>
        </div>
      </section>

      <section className="input-panel">
        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2>srcDiff input</h2>
              <p>Choose a srcdiff XML file. The backend is the source of truth.</p>
            </div>
            <div className="button-row">
              <label className="file-picker">
                <input
                  type="file"
                  accept=".xml,.srcdiff"
                  onChange={(event) => setSelectedUpload(event.target.files?.[0] ?? null)}
                />
                <span>{selectedUpload?.name ?? "Choose srcdiff file"}</span>
              </label>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Converting..." : "Visualize"}
              </button>
            </div>
          </div>
        </form>

        <div className="status-row">
          <span className={error ? "status status-error" : "status status-ok"}>
            {error
              ? error
              : data
                ? `Loaded ${data.files.length} file${data.files.length === 1 ? "" : "s"} from ${data.source_filename}`
                : "Waiting for upload"}
          </span>
          {data ? <span className="status status-info">{data.units} unit(s) extracted</span> : null}
        </div>

        {data ? (
          <div className="file-strip" role="tablist" aria-label="Archive files">
            {data.files.map((file, index) => (
              <button
                key={`${file.unit}-${file.filename}`}
                type="button"
                className={index === selectedFileIndex ? "file-tab file-tab-active" : "file-tab"}
                onClick={() => setSelectedFileIndex(index)}
              >
                {file.filename}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="viewer-grid">
        <ViewerPane
          title="Original before"
          subtitle={selectedFile ? `${selectedFile.filename} revision 0` : "Upload a file to begin"}
          lines={aligned?.beforeLines ?? []}
        />
        <ViewerPane
          title="Original after"
          subtitle={selectedFile ? `${selectedFile.filename} revision 1` : "Upload a file to begin"}
          lines={aligned?.afterLines ?? []}
        />
      </section>
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
    <article className="viewer-panel">
      <header className="viewer-panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </header>
      <div className="codebox" role="region" aria-label={title}>
        {lines.length === 0 ? (
          <div className="empty-state">No code to render yet.</div>
        ) : (
          lines.map((line, index) => (
            <div key={`${title}-${index}`} className={line.hasHighlight ? "code-line code-line-highlight" : "code-line"}>
              <span className="line-number">{line.number > 0 ? line.number : ""}</span>
              <span className="line-content">
                <span className={`segment segment-${line.kind}`}>{line.text || " "}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
