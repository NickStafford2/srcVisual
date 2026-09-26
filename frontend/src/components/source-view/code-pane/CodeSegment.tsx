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
  onMoveInspect?: (moveId: string, position: { x: number; y: number }) => void;
  selected?: boolean;
};

export function CodeSegment({
  revision,
  segment,
  registerMoveSegment,
  unregisterMoveSegment,
  visibleMoveIds,
  onMoveInspect,
  selected = false,
}: CodeSegmentProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  const isMoveHighlight =
    segment.highlighted && segment.kind === "move" && Boolean(segment.moveId);
  const registersMove =
    isMoveHighlight &&
    (visibleMoveIds === undefined || visibleMoveIds.has(segment.moveId!));
  const moveVisualState = selected
    ? "selected"
    : registersMove
      ? "visible"
      : "inactive";

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
      role={onMoveInspect ? "button" : undefined}
      tabIndex={onMoveInspect ? 0 : undefined}
      onClick={(event) => {
        if (segment.moveId) {
          onMoveInspect?.(segment.moveId, {
            x: event.clientX,
            y: event.clientY,
          });
        }
      }}
      onKeyDown={(event) => {
        if (!segment.moveId || !onMoveInspect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          onMoveInspect(segment.moveId, {
            x: bounds.right,
            y: bounds.bottom,
          });
        }
      }}
      data-highlighted-segment="true"
      data-highlight-kind={segment.kind}
      data-node-id={segment.nodeId ?? undefined}
      data-move-id={segment.moveId}
      data-move-visual-state={moveVisualState}
      data-source-revision={revision}
      className={[
        `group relative inline rounded-md ${onMoveInspect ? "cursor-pointer" : ""}`,
        getSourceSegmentClasses(
          segment.kind,
          segment.highlighted,
          moveVisualState,
        ),
      ].join(" ")}
    >
      {text}
    </span>
  );
}
