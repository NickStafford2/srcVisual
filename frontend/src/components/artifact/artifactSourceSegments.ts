import type { ViewerLineSegment } from "../../srcdiff/types";
import type { ArtifactSourceLine } from "../../types";

export function buildArtifactLineSegments(
  line: ArtifactSourceLine,
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
    const _anchor = preferredAnchor(line.anchors);
    return [segmentForRange(" ", _anchor, diffRegions(line.anchors))];
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
    const _anchor = preferredAnchor(_anchors);
    const _segment = segmentForRange(
      line.text.slice(_start, _end),
      _anchor,
      diffRegions(_anchors),
    );
    const _previous = _segments[_segments.length - 1];
    if (
      _previous &&
      _previous.kind === _segment.kind &&
      _previous.nodeId === _segment.nodeId &&
      _previous.moveId === _segment.moveId &&
      sameDiffRegions(_previous.diffRegions, _segment.diffRegions)
    ) {
      _previous.text += _segment.text;
    } else {
      _segments.push(_segment);
    }
  }

  return _segments;
}

function preferredAnchor(anchors: ArtifactSourceLine["anchors"]) {
  return [...anchors].sort(
    (left, right) =>
      anchorPriority(right.kind) - anchorPriority(left.kind) ||
      spanSize(left.span) - spanSize(right.span),
  )[0];
}

function segmentForRange(
  text: string,
  anchor: ArtifactSourceLine["anchors"][number] | undefined,
  regions: NonNullable<ViewerLineSegment["diffRegions"]>,
): ViewerLineSegment {
  return {
    text,
    kind: anchor?.kind ?? "plain",
    highlighted: anchor !== undefined,
    nodeId: anchor?.node_id ?? null,
    moveId: anchor?.move_id ?? null,
    ...(regions.length > 0 ? { diffRegions: regions } : {}),
  };
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
