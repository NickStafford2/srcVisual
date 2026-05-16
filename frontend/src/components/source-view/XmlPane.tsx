import { useMemo, useState } from "react";
import {
  XML_PANE_ID,
  buildLineHref,
  buildXmlLineTargetId,
  jumpToLineTarget,
} from "../../srcdiff/lineLinks";
import { buildXmlDisplayModel } from "../../srcdiff/xmlDisplay";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type { ViewerLineSegment } from "../../srcdiff/types";
import { buildSourceView } from "../../srcdiff/srcView";
import { getSourceSegmentClasses } from "./segmentStyles";

type XmlPaneProps = {
  source: string;
  highlights: SourceViewHighlight[];
};

export function XmlPane({ source, highlights }: XmlPaneProps) {
  const [showPositions, setShowPositions] = useState(false);

  const displayModel = useMemo(
    () => buildXmlDisplayModel(source, highlights, showPositions),
    [source, highlights, showPositions],
  );

  const lines = useMemo(
    () => buildSourceView(displayModel.source, displayModel.highlights),
    [displayModel],
  );
  const title = "XML";

  return (
    <article
      id={XML_PANE_ID}
      aria-label="srcDiff XML"
      className="overflow-hidden rounded-[18px] border border-purple-300/15 bg-slate-950/55"
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setShowPositions((current) => !current)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          {showPositions ? "Hide positions" : "Show positions"}
        </button>
      </header>

      <div className="max-h-[34vh] overflow-auto border-t border-purple-300/10 bg-slate-950/90 font-mono">
        {lines.length === 0 ? (
          <div className="px-5 py-5 text-sm text-slate-400">
            No XML to render yet.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={`${title}-${line.number}`}
              id={buildXmlLineTargetId(line.number)}
              data-highlighted={line.hasHighlight ? "true" : "false"}
              data-line-number={line.number}
              className={[
                "grid grid-cols-[56px_1fr] gap-2 px-4",
                line.hasHighlight ? "bg-white/[0.04]" : "",
              ].join(" ")}
            >
              <a
                href={buildLineHref(buildXmlLineTargetId(line.number))}
                onClick={(event) => {
                  event.preventDefault();
                  jumpToLineTarget(buildXmlLineTargetId(line.number));
                }}
                className="border-r border-white/5 py-1 pr-2 text-right text-xs text-slate-500 transition select-none hover:text-sky-200"
                title={`Jump to XML line ${line.number}`}
              >
                {line.number}
              </a>

              <span className="block py-1 text-xs break-words whitespace-pre-wrap text-slate-100">
                {line.segments.map((segment, segmentIndex) => (
                  <XmlSegment
                    key={`${segment.nodeId ?? "plain"}-${segmentIndex}`}
                    segment={segment}
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

function XmlSegment({ segment }: { segment: ViewerLineSegment }) {
  return (
    <span
      data-highlighted-segment={segment.highlighted ? "true" : "false"}
      data-highlight-kind={segment.kind}
      data-node-id={segment.nodeId ?? undefined}
      className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
    >
      {segment.text}
    </span>
  );
}
