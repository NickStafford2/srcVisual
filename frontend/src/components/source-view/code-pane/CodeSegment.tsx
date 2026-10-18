import { useEffect, useMemo, useRef } from "react";
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

  const visibleAnchors = useMemo(
    () =>
      (
        segment.moveAnchors ??
        (segment.moveId
          ? [
              {
                moveId: segment.moveId,
                nodeId: segment.nodeId ?? segment.moveId,
                origin: segment.moveOrigin ?? "srcmove",
              },
            ]
          : [])
      ).filter(
        (anchor) =>
          visibleMoveIds === undefined || visibleMoveIds.has(anchor.moveId),
      ),
    [
      segment.moveAnchors,
      segment.moveId,
      segment.nodeId,
      segment.moveOrigin,
      visibleMoveIds,
    ],
  );
  const hasSrcdiff = visibleAnchors.some(
    (anchor) => anchor.origin === "srcdiff",
  );
  const hasSrcmove = visibleAnchors.some(
    (anchor) => anchor.origin === "srcmove",
  );
  const isMoveHighlight =
    segment.highlighted && segment.kind === "move" && Boolean(segment.moveId);
  const registersMove = isMoveHighlight && visibleAnchors.length > 0;
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
    const registrations = visibleAnchors.map((anchor) => ({
      moveId: anchor.moveId,
      endpointId: anchor.nodeId,
      moveOrigin: anchor.origin,
      revision,
      element,
    }));
    for (const registration of registrations)
      registerMoveSegment?.(registration);
    return () => {
      for (const registration of registrations)
        unregisterMoveSegment?.(registration);
    };
  }, [
    registersMove,
    registerMoveSegment,
    unregisterMoveSegment,
    revision,
    visibleAnchors,
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
        const moveId =
          event.altKey && visibleAnchors.length > 1
            ? visibleAnchors.find((anchor) => anchor.moveId !== segment.moveId)
                ?.moveId
            : segment.moveId;
        if (moveId) {
          onMoveInspect?.(moveId, {
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
          const moveId =
            event.altKey && visibleAnchors.length > 1
              ? visibleAnchors.find(
                  (anchor) => anchor.moveId !== segment.moveId,
                )?.moveId
              : segment.moveId;
          if (!moveId) return;
          onMoveInspect(moveId, {
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
      data-move-ids={visibleAnchors.map((anchor) => anchor.moveId).join("|")}
      data-move-origin={segment.moveOrigin}
      title={
        visibleAnchors
          .map(
            (anchor) =>
              `${anchor.origin === "srcmove" ? "srcMove" : "srcDiff"}: ${anchor.moveId}`,
          )
          .join(" · ") +
        (visibleAnchors.length > 1
          ? " · Alt-click or Alt-Enter to inspect the overlapping move"
          : "")
      }
      data-move-visual-state={moveVisualState}
      data-source-revision={revision}
      className={[
        `group relative inline rounded-md ${onMoveInspect ? "cursor-pointer" : ""}`,
        hasSrcdiff && !hasSrcmove
          ? "rounded-md bg-violet-400/25 px-0.5 text-violet-100"
          : getSourceSegmentClasses(
              segment.kind,
              segment.highlighted,
              moveVisualState,
            ),
        hasSrcdiff && hasSrcmove
          ? "underline decoration-violet-400 decoration-2 underline-offset-2"
          : "",
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
