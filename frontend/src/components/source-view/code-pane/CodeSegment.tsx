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
  visibleMoveIds?: ReadonlySet<string>;
  onMoveSelect?: (moveId: string) => void;
  selected?: boolean;
};

export function CodeSegment({
  revision,
  segment,
  registerMoveSegment,
  unregisterMoveSegment,
  visibleMoveIds,
  onMoveSelect,
  selected = false,
}: CodeSegmentProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  const isMoveHighlight =
    segment.highlighted && segment.kind === "move" && Boolean(segment.moveId);
  const registersMove =
    isMoveHighlight &&
    (visibleMoveIds === undefined || visibleMoveIds.has(segment.moveId!));

  const text = segment.highlighted
    ? renderVisibleWhitespace(segment.text)
    : segment.text;

  useEffect(() => {
    if (!registersMove || !segment.moveId || !ref.current) {
      return;
    }

    const element = ref.current;
    const moveId = segment.moveId;
    const endpointId = segment.nodeId ?? moveId;

    registerMoveSegment?.({
      moveId,
      endpointId,
      revision,
      element,
    });

    return () => {
      unregisterMoveSegment?.({
        moveId,
        endpointId,
        revision,
        element,
      });
    };
  }, [
    registersMove,
    registerMoveSegment,
    unregisterMoveSegment,
    revision,
    segment.moveId,
    segment.nodeId,
    segment.text,
  ]);

  if (!isMoveHighlight) {
    return (
      <span
        data-highlighted-segment={segment.highlighted ? "true" : "false"}
        data-highlight-kind={segment.kind}
        data-node-id={segment.nodeId ?? undefined}
        className={[
          getSourceSegmentClasses(segment.kind, segment.highlighted),
          selected
            ? "text-sky-100 underline decoration-sky-300 decoration-2 underline-offset-2"
            : "",
        ].join(" ")}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      role={onMoveSelect ? "button" : undefined}
      tabIndex={onMoveSelect ? 0 : undefined}
      onClick={() => {
        if (segment.moveId) onMoveSelect?.(segment.moveId);
      }}
      onKeyDown={(event) => {
        if (!segment.moveId || !onMoveSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onMoveSelect(segment.moveId);
        }
      }}
      data-highlighted-segment="true"
      data-highlight-kind={segment.kind}
      data-node-id={segment.nodeId ?? undefined}
      data-move-id={segment.moveId}
      data-source-revision={revision}
      className={[
        `group relative inline rounded-md ${onMoveSelect ? "cursor-pointer" : ""}`,
        getSourceSegmentClasses(segment.kind, segment.highlighted),
        selected
          ? "text-sky-100 underline decoration-sky-300 decoration-2 underline-offset-2"
          : "",
      ].join(" ")}
    >
      {text}
    </span>
  );
}
