import type {
  HighlightKind,
  SourceCodeSpan,
  ViewerLine,
  ViewerLineSegment,
} from "./types";

export type SourceViewHighlight = {
  nodeId: string;
  moveId?: string | null;
  kind: HighlightKind;
  span: SourceCodeSpan | null | undefined;
};

type LineSlice = {
  startIndex: number;
  endIndex: number;
};

type LineHighlight = {
  nodeId: string;
  moveId?: string | null;
  kind: HighlightKind;
  span: SourceCodeSpan;
};

type HighlightSlice = Omit<LineHighlight, "span"> & LineSlice;

export function buildSourceView(
  sourceCode: string = "",
  highlights: SourceViewHighlight[],
): ViewerLine[] {
  const normalizedSourceCode = sourceCode.replace(/\r\n/g, "\n");
  const sourceLines = normalizedSourceCode.split("\n");

  if (sourceLines.length > 0 && sourceLines[sourceLines.length - 1] === "") {
    sourceLines.pop();
  }

  return sourceLines.map((lineText, index) => {
    const lineNumber = index + 1;
    const lineHighlights = getHighlightsForLine(
      lineNumber,
      lineText,
      highlights,
    );

    if (lineHighlights.length === 0) {
      return buildPlainViewerLine(lineNumber, lineText);
    }

    return {
      number: lineNumber,
      segments: buildHighlightedSegments(lineText, lineHighlights),
      hasHighlight: true,
    };
  });
}

function buildPlainViewerLine(
  lineNumber: number,
  lineText: string,
): ViewerLine {
  return {
    number: lineNumber,
    segments: [
      {
        text: lineText || " ",
        kind: "plain",
        highlighted: false,
        nodeId: null,
        moveId: null,
      },
    ],
    hasHighlight: false,
  };
}

function buildHighlightedSegments(
  lineText: string,
  lineHighlights: LineHighlight[],
): ViewerLineSegment[] {
  const slices = lineHighlights
    .map((highlight) => {
      const { startIndex, endIndex } = sourceSpanToLineSlice(
        lineText,
        highlight.span,
      );

      return {
        nodeId: highlight.nodeId,
        moveId: highlight.moveId ?? null,
        kind: highlight.kind,
        startIndex,
        endIndex,
      };
    });

  if (lineText.length === 0) {
    const highlight = preferredHighlight(slices);
    return [segmentForSlice(" ", highlight)];
  }

  const boundaries = [
    ...new Set([
      0,
      lineText.length,
      ...slices.flatMap((slice) => [slice.startIndex, slice.endIndex]),
    ]),
  ].sort((left, right) => left - right);

  const segments: ViewerLineSegment[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const highlight = preferredHighlight(
      slices.filter(
        (slice) => slice.startIndex <= start && slice.endIndex >= end,
      ),
    );
    const segment = segmentForSlice(lineText.slice(start, end), highlight);
    const previous = segments[segments.length - 1];
    if (
      previous &&
      previous.kind === segment.kind &&
      previous.nodeId === segment.nodeId &&
      previous.moveId === segment.moveId
    ) {
      previous.text += segment.text;
    } else {
      segments.push(segment);
    }
  }

  return segments;
}

function preferredHighlight<T extends HighlightSlice>(highlights: T[]) {
  return [...highlights].sort(
    (left, right) =>
      highlightPriority(right.kind) - highlightPriority(left.kind) ||
      left.endIndex - left.startIndex - (right.endIndex - right.startIndex),
  )[0];
}

function segmentForSlice(
  text: string,
  highlight: HighlightSlice | undefined,
): ViewerLineSegment {
  return {
    text,
    kind: highlight?.kind ?? "plain",
    highlighted: highlight !== undefined,
    nodeId: highlight?.nodeId ?? null,
    moveId: highlight?.moveId ?? null,
  };
}

function highlightPriority(kind: HighlightKind) {
  if (kind === "move") return 2;
  if (kind === "insert" || kind === "delete") return 1;
  return 0;
}

function getHighlightsForLine(
  lineNumber: number,
  lineText: string,
  highlights: SourceViewHighlight[],
): LineHighlight[] {
  return highlights.flatMap((highlight) => {
    if (!highlight.span) return [];

    if (
      lineNumber < highlight.span.start_line ||
      lineNumber > highlight.span.end_line
    ) {
      return [];
    }

    return [
      {
        nodeId: highlight.nodeId,
        moveId: highlight.moveId ?? null,
        kind: highlight.kind,
        span: {
          start_line: lineNumber,
          start_col:
            lineNumber === highlight.span.start_line
              ? highlight.span.start_col
              : 1,
          end_line: lineNumber,
          end_col:
            lineNumber === highlight.span.end_line
              ? highlight.span.end_col
              : Math.max(lineText.length, 1),
        },
      },
    ];
  });
}

function sourceSpanToLineSlice(
  lineText: string,
  lineSpan: SourceCodeSpan,
): LineSlice {
  const startIndex = clamp(lineSpan.start_col - 1, 0, lineText.length);
  const endIndex = clamp(lineSpan.end_col, startIndex, lineText.length);

  return { startIndex, endIndex };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
