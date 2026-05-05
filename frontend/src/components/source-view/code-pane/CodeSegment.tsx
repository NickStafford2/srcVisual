import { useEffect, useRef } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { ViewerLineSegment } from "../../../srcdiff/types";
import { getSourceSegmentClasses } from "../segmentStyles";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";
import { MoveTooltip, type MoveTooltipInfo } from "./MoveTooltip";
import { renderVisibleWhitespace } from "./renderVisibleWhitespace";

type CodeSegmentProps = {
  revision: SourceRevision;
  segment: ViewerLineSegment;
  registerMoveSegment?: RegisterMoveSegment;
  unregisterMoveSegment?: UnregisterMoveSegment;
  moveTooltipInfoById?: Map<string, MoveTooltipInfo>;
};

export function CodeSegment({
  revision,
  segment,
  registerMoveSegment,
  unregisterMoveSegment,
  moveTooltipInfoById,
}: CodeSegmentProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  const isMoveHighlight =
    segment.highlighted && segment.kind === "move" && Boolean(segment.moveId);

  const moveTooltipInfo = segment.moveId
    ? moveTooltipInfoById?.get(segment.moveId)
    : undefined;

  const text = segment.highlighted
    ? renderVisibleWhitespace(segment.text)
    : segment.text;

  useEffect(() => {
    if (!isMoveHighlight || !segment.moveId || !ref.current) {
      return;
    }

    const element = ref.current;
    const moveId = segment.moveId;

    registerMoveSegment?.({
      moveId,
      revision,
      element,
    });

    return () => {
      unregisterMoveSegment?.({
        moveId,
        revision,
        element,
      });
    };
  }, [
    isMoveHighlight,
    registerMoveSegment,
    unregisterMoveSegment,
    revision,
    segment.moveId,
  ]);

  if (!isMoveHighlight) {
    return (
      <span
        className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      data-move-id={segment.moveId}
      className={[
        "group relative inline rounded-md",
        getSourceSegmentClasses(segment.kind, segment.highlighted),
      ].join(" ")}
    >
      {text}

      {moveTooltipInfo ? (
        <MoveTooltip move={moveTooltipInfo} />
      ) : (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/98 px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-slate-100 shadow-2xl group-hover:block">
          move_id: {segment.moveId}
        </span>
      )}
    </span>
  );
}
