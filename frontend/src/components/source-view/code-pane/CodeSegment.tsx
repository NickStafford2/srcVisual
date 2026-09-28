import { useEffect, useRef } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { ViewerLineSegment } from "../../../srcdiff/types";
import type { ArtifactDiffKind } from "../../../types";
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
  visibleDiffKinds?: ReadonlySet<ArtifactDiffKind>;
  onMoveInspect?: (moveId: string, position: { x: number; y: number }) => void;
  selected?: boolean;
  sourceColumn?: number;
};

export function CodeSegment({
  revision,
  segment,
  registerMoveSegment,
  unregisterMoveSegment,
  visibleMoveIds,
  visibleDiffKinds,
  onMoveInspect,
  selected = false,
  sourceColumn = 0,
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

  const diffKind = sourceDiffKind(segment.kind);
  const isDiffHighlightVisible =
    diffKind !== null &&
    (visibleDiffKinds === undefined || visibleDiffKinds.has(diffKind));
  const isVisuallyHighlighted = isMoveHighlight || isDiffHighlightVisible;

  const text =
    segment.highlighted && isVisuallyHighlighted
      ? renderVisibleWhitespace(segment.text, sourceColumn)
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
        data-highlighted-segment={isVisuallyHighlighted ? "true" : "false"}
        data-highlight-kind={segment.kind}
        data-diff-kind={diffKind ?? undefined}
        data-diff-region-ids={diffRegionIds(segment)}
        data-node-id={segment.nodeId ?? undefined}
        data-source-revision={revision}
        className={[
          getSourceSegmentClasses(segment.kind, isVisuallyHighlighted),
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
      data-diff-region-ids={diffRegionIds(segment)}
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

function diffRegionIds(segment: ViewerLineSegment) {
  const ids = segment.diffRegions?.map((region) => region.nodeId) ?? [];
  return ids.length > 0 ? ids.join("|") : undefined;
}

function sourceDiffKind(
  kind: ViewerLineSegment["kind"],
): ArtifactDiffKind | null {
  if (kind === "common" || kind === "delete" || kind === "insert") return kind;
  return null;
}
