import type { SrcMoveResults } from "../../../types";
import { jumpToXmlLineTarget } from "../../../srcdiff/lineLinks";
import { getSelectionSpans } from "../../../srcdiff/selection";
import { buildSelectedNodeLinks } from "./selectedNodeLinks";
import { MoveDetails } from "./MoveDetails";
import type { MoveNodeEntry } from "./moveInfo";

type HighlightedNodeCardProps = {
  entry: MoveNodeEntry;
  moveResults: SrcMoveResults;
  moveNodesById: Map<string, MoveNodeEntry[]>;
  onUnhighlight: (nodeId: string) => void;
};

export function HighlightedNodeCard({
  entry,
  moveResults,
  moveNodesById,
  onUnhighlight,
}: HighlightedNodeCardProps) {
  const { node, fileIndex, filename } = entry;
  const _spans = getSelectionSpans(node);
  const _links = buildSelectedNodeLinks(_spans, fileIndex).filter(
    (_link) => _link.variant !== "xml",
  );
  const moveNodes = node.move_id ? (moveNodesById.get(node.move_id) ?? []) : [];

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-100">
              {node.label}
            </h3>

            {node.move_id ? (
              <span className="border-diff-move-1/30 bg-diff-move-1/10 text-diff-move-1 rounded-full border px-2 py-0.5 text-[11px]">
                move {node.move_id}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-slate-400">{filename}</p>
          <p className="mt-1 font-mono text-[11px] break-all text-slate-500">
            {node.path}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {_spans.xmlSpan ? (
            <button
              type="button"
              onClick={() => jumpToXmlLineTarget(_spans.xmlSpan!.start_line)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              XML
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onUnhighlight(node.id)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Unhighlight
          </button>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">XML span</dt>
          <dd className="font-mono">{formatXmlSpanText(_spans.xmlSpan)}</dd>
        </div>

        <div>
          <dt className="text-slate-500">Links</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {_links.length > 0
              ? _links.map((link) => (
                  <a
                    key={link.targetId}
                    href={`#${link.targetId}`}
                    title={link.title}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/10"
                  >
                    {link.label}
                  </a>
                ))
              : "missing"}
          </dd>
        </div>
      </dl>

      {node.move_id ? (
        <MoveDetails
          moveId={node.move_id}
          nodes={moveNodes}
          moveResults={moveResults}
        />
      ) : null}
    </article>
  );
}

function formatXmlSpanText(
  span: ReturnType<typeof getSelectionSpans>["xmlSpan"],
): string {
  if (!span) {
    return "missing";
  }

  return `${span.start_line}:${span.start_col} → ${span.end_line}:${span.end_col}`;
}
