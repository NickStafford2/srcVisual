import type {
  HighlightKind,
  SourceCodeSpan,
  ViewerLine,
  ViewerLineSegment,
} from "./types";

export type SourceViewHighlight = {
  nodeId: string;
  kind: HighlightKind;
  span: SourceCodeSpan | null | undefined;
};

type LineSlice = {
  startIndex: number;
  endIndex: number;
};

type LineHighlight = {
  nodeId: string;
  kind: HighlightKind;
  span: SourceCodeSpan;
};

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

export function singleSourceHighlight(
  nodeId: string,
  kind: HighlightKind,
  span: SourceCodeSpan | null | undefined,
): SourceViewHighlight[] {
  if (!span) return [];

  return [
    {
      nodeId,
      kind,
      span,
    },
  ];
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
        kind: highlight.kind,
        startIndex,
        endIndex,
      };
    })
    .filter((slice) => slice.endIndex >= slice.startIndex)
    .sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);

  const segments: ViewerLineSegment[] = [];
  let cursor = 0;

  for (const slice of slices) {
    if (slice.endIndex < cursor) {
      continue;
    }

    if (slice.startIndex > cursor) {
      segments.push({
        text: lineText.slice(cursor, slice.startIndex),
        kind: "plain",
        highlighted: false,
        nodeId: null,
      });
    }

    const highlightStart = Math.max(slice.startIndex, cursor);
    const highlightEnd = Math.max(slice.endIndex, highlightStart);

    segments.push({
      text: lineText.slice(highlightStart, highlightEnd) || " ",
      kind: slice.kind,
      highlighted: true,
      nodeId: slice.nodeId,
    });

    cursor = highlightEnd;
  }

  if (cursor < lineText.length) {
    segments.push({
      text: lineText.slice(cursor),
      kind: "plain",
      highlighted: false,
      nodeId: null,
    });
  }

  if (segments.length === 0) {
    segments.push({
      text: lineText || " ",
      kind: lineHighlights[0]?.kind ?? "plain",
      highlighted: true,
      nodeId: lineHighlights[0]?.nodeId ?? null,
    });
  }

  return segments;
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
