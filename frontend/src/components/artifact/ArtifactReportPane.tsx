import { useEffect, useMemo, useState } from "react";
import { fetchArtifactReport } from "../../api";
import type { ArtifactReportProjection } from "../../types";

const buttonClass = "rounded border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40";

export function ArtifactReportPane({ artifactId, active }: { artifactId: string; active: boolean }) {
  const [report, setReport] = useState<ArtifactReportProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!active || report?.artifact_id === artifactId) return;
    let current = true;
    setError(null);
    setCopyStatus("");
    void fetchArtifactReport(artifactId).then(value => {
      if (current) setReport(value);
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof Error ? reason.message : "Unable to load report.");
    });
    return () => { current = false; };
  }, [active, artifactId, report?.artifact_id]);

  const lines = useMemo(() => report?.text.split("\n") ?? [], [report]);
  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report!.text);
      setCopyStatus("Copied.");
    } catch {
      setCopyStatus("Unable to access the clipboard.");
    }
  }

  if (error) return <p role="alert" className="p-4 text-rose-300">{error}</p>;
  if (report?.artifact_id !== artifactId) return <p className="p-4 text-slate-400">Loading report…</p>;
  if (!report.available) return <p className="p-4 text-slate-400">No producer results.json was retained for this artifact. XML-only inputs cannot reconstruct the original report.</p>;
  return (
    <article aria-label="srcMove JSON report" className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/15 bg-slate-950">
      <header className="shrink-0 space-y-2 border-b border-white/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm font-medium">results.json</span>
          <button type="button" className={buttonClass} onClick={() => void copyReport()}>{report.truncated ? "Copy preview" : "Copy JSON"}</button>
          <a className={buttonClass} href={`/api/artifacts/${encodeURIComponent(artifactId)}/report/download`} download="results.json">Download JSON</a>
          <span role="status" className="text-xs text-slate-400">{copyStatus}</span>
        </div>
        {!report.diagnostics_available && <p className="text-xs text-slate-400">Diagnostic details were not recorded; showing the retained results.</p>}
        {report.truncated && <p className="text-xs text-amber-200">Preview limited to the first 262,144 characters and may end inside a JSON value. Download JSON contains the complete report.</p>}
        <p className="text-xs text-slate-400">{lines.length} lines{report.truncated ? " in preview" : ""}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto py-2 font-mono text-xs" aria-label="JSON source">
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-[56px_minmax(max-content,1fr)] gap-3 px-3 leading-5">
            <span className="border-r border-white/10 pr-2 text-right text-slate-500 select-none">{index + 1}</span>
            <code className="whitespace-pre text-slate-300"><JsonLine text={line} /></code>
          </div>
        ))}
      </div>
    </article>
  );
}

function JsonLine({ text }: { text: string }) {
  const pattern = /"(?:\\.|[^"\\])*"\s*:?|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;
  const pieces = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    pieces.push(text.slice(offset, match.index));
    const token = match[0];
    const color = token.startsWith('"') ? (token.trimEnd().endsWith(":") ? "text-sky-300" : "text-emerald-300")
      : token === "null" ? "text-slate-500" : token === "true" || token === "false" ? "text-violet-300" : "text-amber-200";
    pieces.push(<span key={match.index} className={color}>{token}</span>);
    offset = match.index + token.length;
  }
  pieces.push(text.slice(offset));
  return <>{pieces}</>;
}
