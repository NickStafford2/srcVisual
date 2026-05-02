import { useEffect, useMemo, useRef } from "react";
import type {
  HighlightKind,
  SourceCodeSpan,
  ViewerLineSegment,
} from "../../srcdiff/types";
import { buildSourceView } from "../../srcdiff/srcView";
import { getSourceSegmentClasses } from "./segmentStyles";

type XmlPaneProps = {
  title: string;
  subtitle: string;
  source?: string;
  span: SourceCodeSpan | null | undefined;
  kind: HighlightKind;
};

export function XmlPane({
  title,
  subtitle,
  source = "",
  span,
  kind,
}: XmlPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const lines = useMemo(
    () => buildSourceView(source, span, kind),
    [source, span, kind],
  );

  useEffect(() => {
    if (!span) return;

    const scrollContainer = scrollContainerRef.current;
    const highlightedLine = lineRefs.current.get(span.start_line);

    if (!scrollContainer || !highlightedLine) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const lineRect = highlightedLine.getBoundingClientRect();

    const lineTopInsideContainer =
      lineRect.top - containerRect.top + scrollContainer.scrollTop;

    const centeredScrollTop =
      lineTopInsideContainer -
      scrollContainer.clientHeight / 2 +
      highlightedLine.clientHeight / 2;

    scrollContainer.scrollTo({
      top: Math.max(centeredScrollTop, 0),
      behavior: "smooth",
    });
  }, [span?.start_line, span?.start_col, span?.end_line, span?.end_col]);

  return (
    <article className="overflow-hidden rounded-[18px] border border-purple-300/15 bg-slate-950/55">
      <header className="px-4 pt-3 pb-2">
        <h3 className="text-base font-semibold text-slate-50">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>
      </header>

      <div
        ref={scrollContainerRef}
        className="max-h-[34vh] overflow-auto border-t border-purple-300/10 bg-slate-950/90 font-mono"
      >
        {lines.length === 0 ? (
          <div className="px-5 py-5 text-sm text-slate-400">
            No XML to render yet.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={`${title}-${line.number}`}
              ref={(element) => {
                if (element) {
                  lineRefs.current.set(line.number, element);
                } else {
                  lineRefs.current.delete(line.number);
                }
              }}
              className={[
                "grid grid-cols-[56px_1fr] gap-2 px-4",
                line.hasHighlight ? "bg-white/[0.04]" : "",
              ].join(" ")}
            >
              <span className="border-r border-white/5 py-1 pr-2 text-right text-xs text-slate-500 select-none">
                {line.number}
              </span>

              <span className="block py-1 text-xs break-words whitespace-pre-wrap text-slate-100">
                {line.segments.map((segment, segmentIndex) => (
                  <XmlSegment key={segmentIndex} segment={segment} />
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function XmlSegment({ segment }: { segment: ViewerLineSegment }) {
  return (
    <span
      className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
    >
      {segment.text}
    </span>
  );
}
