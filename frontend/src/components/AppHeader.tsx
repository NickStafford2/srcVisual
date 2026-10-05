import { useEffect, useState } from "react";
import initialIdentity from "virtual:viewer-identity";
import type {
  ArtifactFocusProfile,
  ArtifactManifest,
  ComparisonContext,
} from "../types";

const modes = {
  examples: "Example",
  paste: "Pasted XML",
  upload: "Upload",
  history: "Repository history",
  benchmark: "Benchmark review",
};
const focuses = {
  "changes-and-moves": "Changes and moves",
  moves: "Moves",
  changes: "Changes",
  "complete-file": "Complete file",
};

type Props = {
  artifact: ArtifactManifest | null;
  context: ComparisonContext | null;
  view: string;
  focus: ArtifactFocusProfile;
  visibleMoveCount: number;
};

export function AppHeader({
  artifact,
  context,
  view,
  focus,
  visibleMoveCount,
}: Props) {
  const [identity, setIdentity] = useState(initialIdentity);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot || import.meta.env.MODE === "test") return;
    const update = (value: typeof initialIdentity) => setIdentity(value);
    hot.on("viewer-identity", update);
    return () => hot.off("viewer-identity", update);
  }, []);
  const observed =
    artifact?.tools?.identity_status === "observed-runtime-binaries" ||
    artifact?.tools?.identity_status === "recorded-benchmark-binaries" ||
    artifact?.tools?.identity_status === "recorded-history-binaries";
  const srcmove = observed ? artifact?.tools?.srcmove_sha256 : null;
  const srcdiff = observed ? artifact?.tools?.srcdiff_sha256 : null;
  const label =
    context?.label ?? artifact?.source_filename ?? "Choose a comparison";
  const mode = context
    ? modes[context.mode]
    : artifact?.provenance?.origin === "history"
      ? "Repository history"
      : "Comparison";
  const visibility = !artifact
    ? ""
    : visibleMoveCount === artifact.moves.items.length
      ? `All ${visibleMoveCount} moves shown`
      : `${visibleMoveCount} of ${artifact.moves.items.length} moves shown`;
  const details = [
    `Comparison: ${label}`,
    `Input: ${mode}`,
    `View: ${view}`,
    `Source focus: ${focuses[focus]}`,
    `Source connectors: ${visibility}`,
    `Before: ${context?.before ?? "revision 0 (commit unknown)"}`,
    `After: ${context?.after ?? "revision 1 (commit unknown)"}`,
    `Artifact: ${artifact?.artifact_id ?? "none"}`,
    `srcMove recorded runtime SHA-256: ${srcmove ?? "unknown"}`,
    `srcDiff recorded runtime SHA-256: ${srcdiff ?? "unknown"}`,
    `Tool identity status: ${artifact?.tools?.identity_status ?? "unknown"}`,
    `Move results: ${artifact?.provenance?.move_results_source ?? "unknown"}`,
    `srcDiffVisual frontend source SHA-256: ${identity.sha256}`,
    `Viewer mode: ${identity.mode}`,
  ].join("\n");
  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(details);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable; select the details below.");
    }
  }
  return (
    <header className="relative z-20 shrink-0 border border-white/10 bg-slate-950 px-4 py-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-lg font-medium tracking-[0.18em] text-slate-300">
              srcDiffVisual
            </h1>
            <span className="text-sky-300">
              {artifact ? mode : "Input"} · {identity.mode}
            </span>
          </div>
          <p className="mt-1 break-words text-sm font-semibold text-slate-100">
            {label}
          </p>
          {artifact ? (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
              <span>{view}</span>
              <span>Source focus: {focuses[focus]}</span>
              <span>{visibility}</span>
              {context?.before && context.after ? (
                <span title={`${context.before} → ${context.after}`}>
                  Before {context.before.slice(0, 10)} → After{" "}
                  {context.after.slice(0, 10)}
                </span>
              ) : null}
              <span title={artifact.artifact_id}>
                Artifact {artifact.artifact_id.slice(0, 10)}
              </span>
            </p>
          ) : null}
        </div>
        <details className="max-w-full text-slate-400">
          <summary className="cursor-pointer rounded border border-white/15 px-3 py-2 hover:text-white">
            <span className="block">
              srcMove{" "}
              {srcmove ? `SHA ${srcmove.slice(0, 10)}` : "version unknown"}
            </span>
            <span className="block mt-1">
              srcDiffVisual frontend SHA {identity.sha256.slice(0, 10)} ·
              Details
            </span>
          </summary>
          <div className="absolute top-full right-0 z-30 max-h-[65vh] w-[min(44rem,100vw)] overflow-auto rounded-b border border-white/15 bg-slate-950 p-4 shadow-xl">
            <p className="mb-3">
              Tool checksums come from this artifact, never the currently
              installed tools. Recorded runtime binaries do not identify the
              producer of imported XML. The viewer fingerprint covers frontend
              source, assets, configuration and dependencies, including local
              edits; it does not identify the backend.
            </p>
            <button
              type="button"
              onClick={() => void copyDetails()}
              className="mb-3 rounded border border-sky-300/40 px-3 py-1 text-sky-200"
            >
              Copy details
            </button>
            <span role="status" className="ml-3">
              {copyStatus}
            </span>
            <pre className="whitespace-pre-wrap break-all text-[11px]">
              {details}
            </pre>
          </div>
        </details>
      </div>
    </header>
  );
}
