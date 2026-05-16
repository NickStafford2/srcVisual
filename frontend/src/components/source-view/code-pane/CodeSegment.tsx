import { useEffect, useRef } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { ViewerLineSegment } from "../../../srcdiff/types";
import { getSourceSegmentClasses } from "../segmentStyles";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";
import { renderVisibleWhitespace } from "./renderVisibleWhitespace";

type CodeSegmentProps = {
  revision: SourceRevision;
  segment: ViewerLineSegment;
  registerMoveSegment?: RegisterMoveSegment;
  unregisterMoveSegment?: UnregisterMoveSegment;
};

export function CodeSegment({
  revision,
  segment,
  registerMoveSegment,
  unregisterMoveSegment,
}: CodeSegmentProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  const isMoveHighlight =
    segment.highlighted && segment.kind === "move" && Boolean(segment.moveId);

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
    segment.text,
  ]);

  if (!isMoveHighlight) {
    return (
      <span
        data-highlighted-segment={segment.highlighted ? "true" : "false"}
        data-highlight-kind={segment.kind}
        data-node-id={segment.nodeId ?? undefined}
        className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      data-highlighted-segment="true"
      data-highlight-kind={segment.kind}
      data-node-id={segment.nodeId ?? undefined}
      data-move-id={segment.moveId}
      data-source-revision={revision}
      className={[
        "group relative inline rounded-md",
        getSourceSegmentClasses(segment.kind, segment.highlighted),
      ].join(" ")}
    >
      {text}
    </span>
  );
}
