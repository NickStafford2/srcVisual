import type {
  HighlightKind,
  SourceSpan,
  ViewerLine,
  ViewerLineSegment,
} from "./types";

export function buildSourceView(
  source: string = "",
  span: SourceSpan | null | undefined,
  kind: HighlightKind,
): ViewerLine[] {
  const normalizedSource = source.replace(/\r\n/g, "\n");
  const sourceLines = normalizedSource.split("\n");

  if (sourceLines.length > 0 && sourceLines[sourceLines.length - 1] === "") {
    sourceLines.pop();
  }

  return sourceLines.map((lineText, index) => {
    const lineNumber = index + 1;
    const highlightSpanForLine = getSpanForLine(lineNumber, lineText, span);

    if (!highlightSpanForLine) {
      return buildPlainViewerLine(lineNumber, lineText);
    }

    return {
      number: lineNumber,
      segments: buildHighlightedSegments(lineText, highlightSpanForLine, kind),
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
      },
    ],
    hasHighlight: false,
  };
}

function buildHighlightedSegments(
  lineText: string,
  lineSpan: SourceSpan,
  kind: HighlightKind,
): ViewerLineSegment[] {
  const startIndex = clamp(lineSpan.start_col - 1, 0, lineText.length);
  const endIndex = clamp(lineSpan.end_col, startIndex, lineText.length);

  const segments: ViewerLineSegment[] = [];

  if (startIndex > 0) {
    segments.push({
      text: lineText.slice(0, startIndex),
      kind: "plain",
      highlighted: false,
    });
  }

  segments.push({
    text: lineText.slice(startIndex, endIndex) || " ",
    kind,
    highlighted: true,
  });

  if (endIndex < lineText.length) {
    segments.push({
      text: lineText.slice(endIndex),
      kind: "plain",
      highlighted: false,
    });
  }

  return segments;
}

function getSpanForLine(
  lineNumber: number,
  lineText: string,
  span: SourceSpan | null | undefined,
): SourceSpan | null {
  if (!span) {
    return null;
  }

  if (lineNumber < span.start_line || lineNumber > span.end_line) {
    return null;
  }

  return {
    start_line: lineNumber,
    start_col: lineNumber === span.start_line ? span.start_col : 1,
    end_line: lineNumber,
    end_col:
      lineNumber === span.end_line
        ? span.end_col
        : Math.max(lineText.length, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
