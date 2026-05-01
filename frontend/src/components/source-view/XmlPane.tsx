import type {
  HighlightKind,
  ViewerLine,
  ViewerLineSegment,
} from "../../srcdiff/types";

import { getSourceSegmentClasses } from "./segmentStyles";
type XmlPaneProps = {
  title: string;
  subtitle: string;
  lines: ViewerLine[];
};

export function XmlPane({ title, subtitle, lines }: XmlPaneProps) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-purple-300/15 bg-slate-950/55">
      <header className="px-5 pt-5 pb-4">
        <h3 className="text-xl font-semibold text-slate-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
      </header>

      <div className="max-h-[44vh] overflow-auto border-t border-purple-300/10 bg-slate-950/90 font-mono">
        {lines.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-400">
            No XML to render yet.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={`${title}-${line.number}`}
              className={[
                "grid grid-cols-[72px_1fr] gap-3 px-5",
                line.hasHighlight ? "bg-red-500/10" : "",
              ].join(" ")}
            >
              <span className="border-r border-white/5 py-2 pr-3 text-right text-sm text-slate-500 select-none">
                {line.number}
              </span>

              <span className="block py-2 text-sm break-words whitespace-pre-wrap text-slate-100">
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
