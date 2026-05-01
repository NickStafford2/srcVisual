import type {
  HighlightKind,
  ViewerLine,
  ViewerLineSegment,
} from "../../srcdiff/types";

type SourcePaneProps = {
  title: string;
  subtitle: string;
  lines: ViewerLine[];
  onSelectNode?: (nodeId: string) => void;
};

export function SourcePane({
  title,
  subtitle,
  lines,
  onSelectNode,
}: SourcePaneProps) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/45">
      <header className="px-5 pt-5 pb-4">
        <h3 className="text-xl font-semibold text-slate-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
      </header>

      <div className="max-h-[72vh] overflow-auto border-t border-white/10 bg-slate-950/85 font-mono">
        {lines.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-400">
            No source to render yet.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={`${title}-${line.number}`}
              className={[
                "grid grid-cols-[72px_1fr] gap-3 px-5",
                line.hasHighlight ? "bg-white/[0.04]" : "",
              ].join(" ")}
            >
              <span className="border-r border-white/5 py-2 pr-3 text-right text-sm text-slate-500 select-none">
                {line.number}
              </span>

              <span className="block py-2 text-sm break-words whitespace-pre-wrap text-slate-100">
                {line.segments.map((segment, segmentIndex) => (
                  <SourceSegment
                    key={segmentIndex}
                    segment={segment}
                    onSelectNode={onSelectNode}
                  />
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function SourceSegment({
  segment,
  onSelectNode,
}: {
  segment: ViewerLineSegment;
  onSelectNode?: (nodeId: string) => void;
}) {
  const isClickable = Boolean(segment.nodeId && onSelectNode);

  if (!isClickable) {
    return (
      <span
        className={getSourceSegmentClasses(
          segment.kind,
          segment.highlighted,
          false,
        )}
      >
        {segment.text}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={getSourceSegmentClasses(
        segment.kind,
        segment.highlighted,
        true,
      )}
      onClick={() => onSelectNode?.(segment.nodeId!)}
    >
      {segment.text}
    </button>
  );
}

export function getSourceSegmentClasses(
  kind: HighlightKind,
  highlighted: boolean,
  clickable: boolean,
): string {
  const interactionClasses = clickable
    ? "cursor-pointer text-left font-mono hover:bg-white/10"
    : "";

  if (!highlighted) {
    return interactionClasses;
  }

  const highlightClasses =
    kind === "delete"
      ? "rounded-md bg-amber-300/25"
      : kind === "insert"
        ? "rounded-md bg-sky-300/25"
        : kind === "move"
          ? "rounded-md bg-emerald-300/25"
          : "rounded-md bg-white/10";

  return [highlightClasses, interactionClasses].filter(Boolean).join(" ");
}
