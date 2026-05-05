import { getSelectionSpans } from "../../../srcdiff/selection";
import type { SrcDiffTreeNode } from "../../../srcdiff/types";

type MoveDetailsNode = {
  node: SrcDiffTreeNode;
  fileIndex: number;
  filename: string | null;
};

type MoveDetailsProps = {
  moveId: string | null;
  selectedNodeId: string | null;
  nodes: MoveDetailsNode[];
  variant?: "panel" | "embedded";
};

function formatSpanText(node: SrcDiffTreeNode) {
  const spans = getSelectionSpans(node);

  const rev0 = spans.revision0Span
    ? `${spans.revision0Span.start_line}:${spans.revision0Span.start_col}-${spans.revision0Span.end_line}:${spans.revision0Span.end_col}`
    : "missing";
  const rev1 = spans.revision1Span
    ? `${spans.revision1Span.start_line}:${spans.revision1Span.start_col}-${spans.revision1Span.end_line}:${spans.revision1Span.end_col}`
    : "missing";

  return { rev0, rev1 };
}

export function MoveDetails({
  moveId,
  selectedNodeId,
  nodes,
  variant = "panel",
}: MoveDetailsProps) {
  if (!moveId || nodes.length === 0) {
    return null;
  }

  const files = Array.from(
    new Set(nodes.map((node) => node.filename ?? `file ${node.fileIndex + 1}`)),
  );
  const selectedEntry =
    nodes.find((node) => node.node.id === selectedNodeId) ?? nodes[0] ?? null;
  const isEmbedded = variant === "embedded";

  return (
    <section
      className={
        isEmbedded
          ? "rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.04] p-4"
          : "rounded-[20px] border border-emerald-300/15 bg-emerald-500/[0.04] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl"
      }
    >
      <header className="flex flex-col gap-3 border-b border-emerald-300/10 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Move Details</h2>
          <p className="mt-1 text-xs text-slate-400">
            {nodes.length} node{nodes.length === 1 ? "" : "s"} across{" "}
            {files.length} file{files.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200">
          move={moveId}
        </span>
      </header>

      {selectedEntry ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Anchor
          </p>
          <h3 className="mt-2 text-sm font-semibold text-slate-100">
            {selectedEntry.node.label}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedEntry.filename ?? "unknown file"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {selectedEntry.node.path}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Files
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((file) => (
              <span
                key={file}
                className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs text-slate-200"
              >
                {file}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Nodes
          </p>
          <ul className="mt-2 space-y-2">
            {nodes.map((entry) => {
              const spans = formatSpanText(entry.node);
              const isSelected = entry.node.id === selectedNodeId;

              return (
                <li
                  key={`${entry.fileIndex}-${entry.node.id}`}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {entry.node.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {entry.filename ?? "unknown file"}
                      </p>
                    </div>

                    {isSelected ? (
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-200">
                        selected
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 font-mono text-[11px] text-slate-500">
                    {entry.node.path}
                  </p>

                  <p className="mt-2 font-mono text-[11px] text-slate-400">
                    rev0: {spans.rev0}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    rev1: {spans.rev1}
                  </p>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
