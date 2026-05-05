import { useEffect, useRef } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { ViewerLineSegment } from "../../../srcdiff/types";
import { getSourceSegmentClasses } from "../segmentStyles";
import type { RegisterMoveSegment } from "./moveConnectors";
import { renderVisibleWhitespace } from "./renderVisibleWhitespace";

type CodeSegmentProps = {
  revision: SourceRevision;
  segment: ViewerLineSegment;
  registerMoveSegment?: RegisterMoveSegment;
};

export function CodeSegment({
  revision,
  segment,
  registerMoveSegment,
}: CodeSegmentProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isMoveHighlight =
    segment.highlighted && segment.kind === "move" && Boolean(segment.moveId);

  const text = segment.highlighted
    ? renderVisibleWhitespace(segment.text)
    : segment.text;

  useEffect(() => {
    if (!isMoveHighlight || !segment.moveId) {
      return;
    }

    registerMoveSegment?.({
      moveId: segment.moveId,
      revision,
      element: ref.current,
    });

    return () => {
      registerMoveSegment?.({
        moveId: segment.moveId!,
        revision,
        element: null,
      });
    };
  }, [isMoveHighlight, registerMoveSegment, revision, segment.moveId]);

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
      data-move-id={segment.moveId ?? undefined}
      className={[
        "group relative inline rounded-md",
        getSourceSegmentClasses(segment.kind, segment.highlighted),
      ].join(" ")}
    >
      {text}

      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-slate-100 shadow-xl group-hover:block">
        move_id: {segment.moveId}
      </span>
    </span>
  );
}
