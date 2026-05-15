import type { SrcMoveResults } from "../../../types";
import { buildMoveIds, type MoveNodeEntry } from "./moveInfo";
import { MoveSummaryCard } from "./MoveSummaryCard";

type MoveSummaryProps = {
  moveResults: SrcMoveResults;
  moveNodesById: Map<string, MoveNodeEntry[]>;
  onHighlightMoveGroup: (nodeId: string) => void;
};

export function MoveSummary({
  moveResults,
  moveNodesById,
  onHighlightMoveGroup,
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
            return (
              <MoveSummaryCard
                key={moveId}
                moveId={moveId}
                moveResults={moveResults}
                moveNodes={moveNodesById.get(moveId) ?? []}
                onHighlightMoveGroup={onHighlightMoveGroup}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
