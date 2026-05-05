import type { SrcMoveResults } from "../../../types";
import {
  buildMoveInfo,
  formatNodeSpanText,
  type MoveNodeEntry,
} from "./moveInfo";

type MoveDetailsProps = {
  moveId: string | null;
  selectedNodeId: string | null;
  nodes: MoveNodeEntry[];
  moveResults: SrcMoveResults;
  variant?: "panel" | "embedded";
};

export function MoveDetails({
  moveId,
  selectedNodeId,
  nodes,
  moveResults,
  variant = "panel",
}: MoveDetailsProps) {
  if (!moveId) {
    return null;
  }

  const move = buildMoveInfo(moveId, moveResults, nodes);
  if (!move.record && move.nodes.length === 0) {
    return null;
  }

  const selectedEntry =
    move.nodes.find((node) => node.node.id === selectedNodeId) ??
    move.nodes[0] ??
    null;
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
            {move.nodes.length} node{move.nodes.length === 1 ? "" : "s"} across{" "}
            {move.files.length} file{move.files.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200">
          move={move.moveId}
        </span>
      </header>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Summary
          </p>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            <p>delete paths: {move.fromXpaths.length}</p>
            <p>insert paths: {move.toXpaths.length}</p>
            <p>before texts: {move.fromRawTexts.length}</p>
            <p>after texts: {move.toRawTexts.length}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {move.files.map((file) => (
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
            Raw Text
          </p>

          <div className="mt-2 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Before
              </p>
              <pre className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-slate-200">
                {formatRawTextBlock(move.fromRawTexts)}
              </pre>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                After
              </p>
              <pre className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-slate-200">
                {formatRawTextBlock(move.toRawTexts)}
              </pre>
            </div>
          </div>
        </article>
      </div>

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

      {move.fromXpaths.length > 0 || move.toXpaths.length > 0 ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              From XPaths
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
              {move.fromXpaths.map((xpath) => (
                <li key={xpath} className="break-all">
                  {xpath}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              To XPaths
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
              {move.toXpaths.map((xpath) => (
                <li key={xpath} className="break-all">
                  {xpath}
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}

      {move.nodes.length > 0 ? (
        <article className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Nodes
          </p>
          <ul className="mt-2 space-y-2">
            {move.nodes.map((entry) => {
              const spans = formatNodeSpanText(entry.node);
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
      ) : null}
    </section>
  );
}

function formatRawTextBlock(values: string[]): string {
  if (values.length === 0) {
    return "missing";
  }

  return values.join("\n\n---\n\n");
}
