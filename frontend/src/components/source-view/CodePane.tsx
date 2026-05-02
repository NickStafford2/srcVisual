import { useMemo } from "react";
import {
  buildLineHref,
  buildSourceLineTargetId,
  jumpToLineTarget,
  type SourceRevision,
} from "../../srcdiff/lineLinks";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type { ViewerLineSegment } from "../../srcdiff/types";
import { buildSourceView } from "../../srcdiff/srcView";
import { getSourceSegmentClasses } from "./segmentStyles";

type CodePaneProps = {
  fileIndex: number;
  revision: SourceRevision;
  title: string;
  subtitle: string;
  source?: string;
  highlights: SourceViewHighlight[];
};

export function CodePane({
  fileIndex,
  revision,
  title,
  subtitle,
  source = "",
  highlights,
}: CodePaneProps) {
  const lines = useMemo(
    () => buildSourceView(source, highlights),
    [source, highlights],
  );
  const isRevisionOne = revision === "revision-1";

  return (
    <article
      className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/45"
      style={getCodePaneSurfaceStyle(revision)}
    >
      <header
        className={[
          "px-4 pt-3 pb-2",
          isRevisionOne ? "text-right" : "text-left",
        ].join(" ")}
      >
        <h3 className="text-base font-semibold text-slate-50">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>
      </header>

      <div
        className="max-h-[58vh] overflow-auto border-t border-white/10 bg-slate-950/85 font-mono"
        style={getCodePaneBodyStyle(revision)}
      >
        {lines.length === 0 ? (
          <div className="px-5 py-5 text-sm text-slate-400">
            No source to render yet.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={`${title}-${line.number}`}
              id={buildSourceLineTargetId(fileIndex, revision, line.number)}
              className={[
                "grid grid-cols-[56px_1fr] gap-2 px-4",
                line.hasHighlight ? "bg-white/[0.04]" : "",
              ].join(" ")}
            >
              <a
                href={buildLineHref(
                  buildSourceLineTargetId(fileIndex, revision, line.number),
                )}
                onClick={(event) => {
                  event.preventDefault();
                  jumpToLineTarget(
                    buildSourceLineTargetId(fileIndex, revision, line.number),
                  );
                }}
                className="border-r border-white/5 py-1 pr-2 text-right text-xs text-slate-500 transition select-none hover:text-sky-200"
                title={`Jump to ${title} line ${line.number}`}
              >
                {line.number}
              </a>

              <span className="block py-1 text-xs break-words whitespace-pre-wrap text-slate-100">
                {line.segments.map((segment, segmentIndex) => (
                  <CodeSegment
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

function getCodePaneSurfaceStyle(revision: SourceRevision): {
  backgroundImage: string;
} {
  const direction = revision === "revision-0" ? "90deg" : "270deg";

  return {
    backgroundImage: `linear-gradient(${direction}, rgb(var(--site-bg-rgb) / 0.92) 0%, rgb(var(--site-bg-rgb) / 0.72) 30%, rgb(var(--site-bg-rgb) / 0.36) 58%, rgb(2 6 23 / 0.08) 82%, rgb(2 6 23 / 0) 100%)`,
  };
}

function getCodePaneBodyStyle(revision: SourceRevision): {
  backgroundImage: string;
} {
  const direction = revision === "revision-0" ? "90deg" : "270deg";

  return {
    backgroundImage: `linear-gradient(${direction}, rgb(var(--site-bg-rgb) / 0.82) 0%, rgb(var(--site-bg-rgb) / 0.54) 32%, rgb(var(--site-bg-rgb) / 0.24) 60%, rgb(2 6 23 / 0.1) 84%, rgb(2 6 23 / 0) 100%)`,
  };
}
