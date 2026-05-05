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
};

export function MoveDetails({
  moveId,
  selectedNodeId,
  nodes,
  moveResults,
}: MoveDetailsProps) {
  if (!moveId) {
    return null;
  }

  const move = buildMoveInfo(moveId, moveResults, nodes);
  if (!move.record && move.nodes.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-row rounded-[20px] border border-emerald-300/15 bg-emerald-500/[0.04] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex w-fit flex-row">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
            Summary
          </p>
          <p className="text-xs text-nowrap text-slate-400">
            {move.nodes.length} node{move.nodes.length === 1 ? "" : "s"} across{" "}
            {move.files.length} file{move.files.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-2 text-xs text-slate-300">
            <p>delete paths: {move.fromXpaths.length}</p>
            <p>insert paths: {move.toXpaths.length}</p>
            <p>before texts: {move.fromRawTexts.length}</p>
            <p>after texts: {move.toRawTexts.length}</p>
          </div>

          <p className="text-xs text-nowrap text-slate-400">
            {move.nodes.length} node{move.nodes.length === 1 ? "" : "s"} across{" "}
            {move.files.length} file{move.files.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2">
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
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Before
              </p>
              <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-slate-200">
                {formatRawTextBlock(move.fromRawTexts)}
              </pre>
            </div>

            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                After
              </p>
              <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-slate-200">
                {formatRawTextBlock(move.toRawTexts)}
              </pre>
            </div>
          </div>
        </article>
      </div>

      {move.nodes.length > 0 ? (
        <article className="flex w-fit flex-col rounded-2xl border border-white/10 bg-amber-600 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
            Nodes
          </p>
          <ul className="space-y-2">
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
                      <p className="text-xs text-slate-400">
                        {entry.filename ?? "unknown file"}
                      </p>
                    </div>

                    {isSelected ? (
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-200">
                        selected
                      </span>
                    ) : null}
                  </div>

                  <p className="font-mono text-[11px] text-slate-500">
                    {entry.node.path}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
                    rev0: {spans.rev0}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
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
