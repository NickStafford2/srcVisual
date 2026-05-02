import { useMemo } from "react";
import type {
  HighlightKind,
  SourceCodeSpan,
  ViewerLineSegment,
} from "../../srcdiff/types";
import { buildSourceView } from "../../srcdiff/srcView";
import { getSourceSegmentClasses } from "./segmentStyles";

type CodePaneProps = {
  title: string;
  subtitle: string;
  source?: string;
  span: SourceCodeSpan | null | undefined;
  kind: HighlightKind;
};

export function CodePane({
  title,
  subtitle,
  source = "",
  span,
  kind,
}: CodePaneProps) {
  const lines = useMemo(
    () => buildSourceView(source, span, kind),
    [source, span, kind],
  );

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
                  <CodeSegment key={segmentIndex} segment={segment} />
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function CodeSegment({ segment }: { segment: ViewerLineSegment }) {
  const text = segment.highlighted
    ? renderVisibleWhitespace(segment.text)
    : segment.text;

  return (
    <span
      className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
    >
      {text}
    </span>
  );
}

function renderVisibleWhitespace(text: string): string {
  return text.replace(/ /g, "·").replace(/\t/g, "⇥");
}
