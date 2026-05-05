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

  if (segment.highlighted || segment.kind === "move" || segment.moveId) {
    console.log("source segment debug", {
      revision,
      text: segment.text,
      highlighted: segment.highlighted,
      kind: segment.kind,
      moveId: segment.moveId,
      isMoveHighlight,
    });
  }

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

    console.log("registering move segment", {
      moveId,
      revision,
      text: segment.text,
      element,
    });

    registerMoveSegment?.({
      moveId,
      revision,
      element,
    });

    return () => {
      console.log("unregistering move segment", {
        moveId,
        revision,
        text: segment.text,
        element,
      });

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
    segment.text,
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
      data-source-revision={revision}
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
