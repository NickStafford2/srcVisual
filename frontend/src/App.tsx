import { useDeferredValue, useState } from "react";
import { DELETE_INSERT_SAMPLE, NESTED_SAMPLE, SIMPLE_MOVE_SAMPLE } from "./samples";
import { parseSrcDiff, type ViewerLine } from "./srcdiff";

export default function App() {
  const [xmlInput, setXmlInput] = useState(NESTED_SAMPLE);
  const deferredXml = useDeferredValue(xmlInput);

  let parsed: ReturnType<typeof parseSrcDiff> | null = null;
  let parseError: string | null = null;

  try {
    parsed = parseSrcDiff(deferredXml);
  } catch (error) {
    parseError = error instanceof Error ? error.message : "Unable to parse srcDiff input";
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">srcMove / srcDiff viewer</p>
          <h1>Visualize before-and-after code directly from srcDiff XML.</h1>
          <p className="hero-copy">
            Paste a srcDiff document, then inspect the reconstructed source side by side.
            Deletes stay on the left, inserts stay on the right, and move-tagged regions glow
            on both sides.
          </p>
        </div>
        <div className="legend">
          <span className="chip chip-delete">Delete</span>
          <span className="chip chip-insert">Insert</span>
          <span className="chip chip-move">Move</span>
        </div>
      </section>

      <section className="input-panel">
        <div className="panel-header">
          <div>
            <h2>srcDiff input</h2>
            <p>Live parsing, no backend yet. This is the hello-world pass.</p>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => setXmlInput(NESTED_SAMPLE)}>
              Load nested sample
            </button>
            <button type="button" onClick={() => setXmlInput(SIMPLE_MOVE_SAMPLE)}>
              Load move sample
            </button>
            <button type="button" onClick={() => setXmlInput(DELETE_INSERT_SAMPLE)}>
              Load rename sample
            </button>
          </div>
        </div>

        <textarea
          className="xml-input"
          spellCheck={false}
          value={xmlInput}
          onChange={(event) => setXmlInput(event.target.value)}
          placeholder="Paste srcDiff XML here"
        />

        <div className="status-row">
          <span className={parseError ? "status status-error" : "status status-ok"}>
            {parseError ? parseError : "Parsed successfully"}
          </span>
          {parsed ? (
            <span className="status status-info">
              {parsed.summary.deletes} deletes, {parsed.summary.inserts} inserts,{" "}
              {parsed.summary.moves} move-marked regions
            </span>
          ) : null}
        </div>
      </section>

      <section className="viewer-grid">
        <ViewerPane
          title="Original before"
          subtitle="Common code plus diff:delete regions"
          lines={parsed?.beforeLines ?? []}
        />
        <ViewerPane
          title="Original after"
          subtitle="Common code plus diff:insert regions"
          lines={parsed?.afterLines ?? []}
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
          lines.map((line) => (
            <div
              key={`${title}-${line.number}`}
              className={line.hasHighlight ? "code-line code-line-highlight" : "code-line"}
            >
              <span className="line-number">{line.number}</span>
              <span className="line-content">
                {line.segments.length > 0 ? (
                  line.segments.map((segment, index) => (
                    <span
                      key={`${title}-${line.number}-${index}`}
                      className={`segment segment-${segment.kind}`}
                    >
                      {segment.text}
                    </span>
                  ))
                ) : (
                  <span className="segment segment-plain"> </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
