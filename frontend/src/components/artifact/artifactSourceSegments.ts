import type { ViewerLineSegment } from "../../srcdiff/types";
import type { ArtifactSourceLine } from "../../types";

export function buildArtifactLineSegments(
  line: ArtifactSourceLine,
  visibleMoveIds?: ReadonlySet<string>,
): ViewerLineSegment[] {
  const _slices = line.anchors.flatMap((anchor) => {
    const _start =
      line.line_number === anchor.span.start_line
        ? Math.max(0, anchor.span.start_col - 1)
        : 0;
    const _end =
      line.line_number === anchor.span.end_line
        ? Math.min(line.text.length, anchor.span.end_col)
        : line.text.length;
    return _end > _start ? [{ anchor, start: _start, end: _end }] : [];
  });

  if (line.text.length === 0) {
    const _anchor = preferredAnchor(line.anchors, visibleMoveIds);
    return [
      segmentForRange(
        " ",
        _anchor,
        diffRegions(line.anchors),
        moveAnchors(line.anchors, visibleMoveIds),
      ),
    ];
  }

  const _boundaries = [
    ...new Set([
      0,
      line.text.length,
      ..._slices.flatMap((slice) => [slice.start, slice.end]),
    ]),
  ].sort((left, right) => left - right);
  const _segments: ViewerLineSegment[] = [];

  for (let _index = 0; _index < _boundaries.length - 1; _index += 1) {
    const _start = _boundaries[_index];
    const _end = _boundaries[_index + 1];
    const _anchors = _slices
      .filter((slice) => slice.start <= _start && slice.end >= _end)
      .map((slice) => slice.anchor);
    const _anchor = preferredAnchor(_anchors, visibleMoveIds);
    const _segment = segmentForRange(
      line.text.slice(_start, _end),
      _anchor,
      diffRegions(_anchors),
      moveAnchors(_anchors, visibleMoveIds),
    );
    const _previous = _segments[_segments.length - 1];
    if (
      _previous &&
      _previous.kind === _segment.kind &&
      _previous.nodeId === _segment.nodeId &&
      _previous.moveId === _segment.moveId &&
      JSON.stringify(_previous.moveAnchors) ===
        JSON.stringify(_segment.moveAnchors) &&
      sameDiffRegions(_previous.diffRegions, _segment.diffRegions)
    ) {
      _previous.text += _segment.text;
    } else {
      _segments.push(_segment);
    }
  }

  return _segments;
}

function preferredAnchor(
  anchors: ArtifactSourceLine["anchors"],
  visibleMoveIds?: ReadonlySet<string>,
) {
  return anchors
    .flatMap((anchor) => {
      if (
        anchor.kind !== "move" ||
        (anchor.move_id !== null &&
          (visibleMoveIds === undefined || visibleMoveIds.has(anchor.move_id)))
      )
        return [anchor];
      return anchor.diff_kind
        ? [{ ...anchor, kind: anchor.diff_kind, move_id: null }]
        : [];
    })
    .sort(
      (left, right) =>
        anchorPriority(right.kind) - anchorPriority(left.kind) ||
        (left.move_origin === "srcmove" ? -1 : 0) -
          (right.move_origin === "srcmove" ? -1 : 0) ||
        spanSize(left.span) - spanSize(right.span),
    )[0];
}

function segmentForRange(
  text: string,
  anchor: ArtifactSourceLine["anchors"][number] | undefined,
  regions: NonNullable<ViewerLineSegment["diffRegions"]>,
  moves: NonNullable<ViewerLineSegment["moveAnchors"]>,
): ViewerLineSegment {
  return {
    text,
    kind: anchor?.kind ?? "plain",
    highlighted: anchor !== undefined,
    nodeId: anchor?.node_id ?? null,
    moveId: anchor?.move_id ?? null,
    ...(anchor?.move_origin ? { moveOrigin: anchor.move_origin } : {}),
    ...(moves.length > 1 || anchor?.move_origin ? { moveAnchors: moves } : {}),
    ...(regions.length > 0 ? { diffRegions: regions } : {}),
  };
}

function moveAnchors(
  anchors: ArtifactSourceLine["anchors"],
  visibleMoveIds?: ReadonlySet<string>,
): NonNullable<ViewerLineSegment["moveAnchors"]> {
  return anchors.flatMap((anchor) =>
    anchor.kind === "move" &&
    anchor.move_id &&
    (visibleMoveIds === undefined || visibleMoveIds.has(anchor.move_id))
      ? [
          {
            moveId: anchor.move_id,
            nodeId: anchor.node_id,
            origin: anchor.move_origin ?? "srcmove",
          },
        ]
      : [],
  );
}

function diffRegions(
  anchors: ArtifactSourceLine["anchors"],
): NonNullable<ViewerLineSegment["diffRegions"]> {
  const _regions = new Map<
    string,
    NonNullable<ViewerLineSegment["diffRegions"]>[number]
  >();
  for (const anchor of [...anchors].sort(
    (left, right) => spanSize(right.span) - spanSize(left.span),
  )) {
    const kind =
      anchor.diff_kind ??
      (anchor.kind === "common" ||
      anchor.kind === "delete" ||
      anchor.kind === "insert"
        ? anchor.kind
        : null);
    if (kind) _regions.set(anchor.node_id, { nodeId: anchor.node_id, kind });
  }
  return [..._regions.values()];
}

function sameDiffRegions(
  left: ViewerLineSegment["diffRegions"],
  right: ViewerLineSegment["diffRegions"],
) {
  return (
    left?.length === right?.length &&
    left?.every(
      (region, index) =>
        region.nodeId === right?.[index]?.nodeId &&
        region.kind === right[index].kind,
    )
  );
}

function anchorPriority(kind: ArtifactSourceLine["anchors"][number]["kind"]) {
  if (kind === "move") return 2;
  if (kind === "common" || kind === "insert" || kind === "delete") return 1;
  return 0;
}

function spanSize(span: ArtifactSourceLine["anchors"][number]["span"]) {
  return (
    (span.end_line - span.start_line) * 1_000_000 +
    span.end_col -
    span.start_col
  );
}
