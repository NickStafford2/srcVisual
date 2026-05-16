import type { SrcMoveResults } from "../../../types";
import { buildMoveInfo, summarizeTextList, type MoveNodeEntry } from "./moveInfo";

type MoveSummaryCardProps = {
  moveId: string;
  moveResults: SrcMoveResults;
  moveNodes: MoveNodeEntry[];
  onHighlightMoveGroup?: (nodeId: string) => void;
  onClose?: () => void;
  className?: string;
  embedded?: boolean;
};

export function MoveSummaryCard({
  moveId,
  moveResults,
  moveNodes,
  onHighlightMoveGroup,
  onClose,
  className,
  embedded = false,
}: MoveSummaryCardProps) {
  const move = buildMoveInfo(moveId, moveResults, moveNodes);
  const anchorNode = move.nodes[0]?.node ?? null;

  return (
    <article
      className={[
        embedded
          ? "px-4 py-3"
          : "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">move={moveId}</h3>
          <p className="mt-1 text-xs text-slate-400">
            {move.nodes.length} node{move.nodes.length === 1 ? "" : "s"} across{" "}
            {move.files.length} file{move.files.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-start gap-2">
          {anchorNode && onHighlightMoveGroup ? (
            <button
              type="button"
              onClick={() => onHighlightMoveGroup(anchorNode.id)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Highlight move
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              aria-label={`Close move ${moveId}`}
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              X
            </button>
          ) : null}
        </div>
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
}
