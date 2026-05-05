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
  const text = segment.highlighted
    ? renderVisibleWhitespace(segment.text)
    : segment.text;

  useEffect(() => {
    if (!segment.highlighted || segment.kind !== "move" || !segment.moveId) {
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
  }, [
    registerMoveSegment,
    revision,
    segment.highlighted,
    segment.kind,
    segment.moveId,
  ]);

  return (
    <span
      ref={ref}
      data-move-id={segment.moveId ?? undefined}
      className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
    >
      {text}
    </span>
  );
}
