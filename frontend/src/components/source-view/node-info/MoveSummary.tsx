import type { SrcMoveResults } from "../../../types";
import { buildMoveIds, buildMoveInfo, summarizeTextList, type MoveNodeEntry } from "./moveInfo";

type MoveSummaryProps = {
  moveResults: SrcMoveResults;
  moveNodesById: Map<string, MoveNodeEntry[]>;
  selectedMoveId: string | null;
  onSelectNode: (nodeId: string) => void;
};

export function MoveSummary({
  moveResults,
  moveNodesById,
  selectedMoveId,
  onSelectNode,
}: MoveSummaryProps) {
  const moveIds = buildMoveIds(moveResults, moveNodesById);

  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Move Summary</h2>
          <p className="mt-1 text-xs text-slate-400">
            {moveIds.length} move{moveIds.length === 1 ? "" : "s"} in this result
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            annotated={moveResults.annotated_regions}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            candidates={moveResults.candidates_total}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            groups={moveResults.groups_total}
          </span>
        </div>
      </header>

      {moveIds.length === 0 ? (
        <div className="pt-4 text-sm text-slate-400">No moves found.</div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {moveIds.map((moveId) => {
            const move = buildMoveInfo(
              moveId,
              moveResults,
              moveNodesById.get(moveId) ?? [],
            );
            const anchorNode = move.nodes[0]?.node ?? null;
            const isSelected = selectedMoveId === moveId;

            return (
              <article
                key={moveId}
                className={
                  isSelected
                    ? "rounded-2xl border border-emerald-300/20 bg-emerald-300/8 px-4 py-3"
                    : "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      move={moveId}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {move.nodes.length} node{move.nodes.length === 1 ? "" : "s"} across{" "}
                      {move.files.length} file{move.files.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  {anchorNode ? (
                    <button
                      type="button"
                      onClick={() => onSelectNode(anchorNode.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      Focus move
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {move.files.map((file) => (
                    <span
                      key={`${moveId}-${file}`}
                      className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs text-slate-200"
                    >
                      {file}
                    </span>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Before
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-slate-200">
                      {summarizeTextList(move.fromRawTexts)}
                    </pre>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      After
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-slate-200">
                      {summarizeTextList(move.toRawTexts)}
                    </pre>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
