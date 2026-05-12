import {
  buildLineHref,
  buildSourceLineTargetId,
  jumpToLineTarget,
  type SourceRevision,
} from "../../../srcdiff/lineLinks";
import type { ViewerLineSegment } from "../../../srcdiff/types";
import { CodeSegment } from "./CodeSegment";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";
import type { MoveTooltipInfo } from "./MoveTooltip";

export type SourceViewLine = {
  number: number;
  hasHighlight: boolean;
  segments: ViewerLineSegment[];
};

type CodeLineProps = {
  fileIndex: number;
  revision: SourceRevision;
  title: string;
  line: SourceViewLine;
  moveTooltipInfoById?: Map<string, MoveTooltipInfo>;
  registerMoveSegment?: RegisterMoveSegment;
  unregisterMoveSegment?: UnregisterMoveSegment;
};

export function CodeLine({
  fileIndex,
  revision,
  title,
  line,
  moveTooltipInfoById,
  registerMoveSegment,
  unregisterMoveSegment,
}: CodeLineProps) {
  const lineTargetId = buildSourceLineTargetId(
    fileIndex,
    revision,
    line.number,
  );

  return (
    <div
      id={lineTargetId}
      data-highlighted={line.hasHighlight ? "true" : "false"}
      data-line-number={line.number}
      data-source-revision={revision}
      className={[
        "grid grid-cols-[56px_1fr] gap-2 px-4",
        line.hasHighlight ? "bg-white/[0.04]" : "",
      ].join(" ")}
    >
      <a
        href={buildLineHref(lineTargetId)}
        onClick={(event) => {
          event.preventDefault();
          jumpToLineTarget(lineTargetId);
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
            revision={revision}
            segment={segment}
            registerMoveSegment={registerMoveSegment}
            unregisterMoveSegment={unregisterMoveSegment}
            moveTooltipInfoById={moveTooltipInfoById}
          />
        ))}
      </span>
    </div>
  );
}
