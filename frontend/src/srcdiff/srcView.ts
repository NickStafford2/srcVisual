import type {
  HighlightKind,
  SourceCodeSpan,
  ViewerLine,
  ViewerLineSegment,
} from "./types";

type LineSlice = {
  startIndex: number;
  endIndex: number;
};

export function buildSourceView(
  sourceCode: string = "",
  sourceCodeSpan: SourceCodeSpan | null | undefined,
  kind: HighlightKind,
): ViewerLine[] {
  const normalizedSourceCode = sourceCode.replace(/\r\n/g, "\n");
  const sourceLines = normalizedSourceCode.split("\n");

  if (sourceLines.length > 0 && sourceLines[sourceLines.length - 1] === "") {
    sourceLines.pop();
  }

  return sourceLines.map((lineText, index) => {
    const lineNumber = index + 1;
    const lineSpan = getSpanForLine(lineNumber, lineText, sourceCodeSpan);

    if (!lineSpan) {
      return buildPlainViewerLine(lineNumber, lineText);
    }

    return {
      number: lineNumber,
      segments: buildHighlightedSegments(lineText, lineSpan, kind),
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
  lineSpan: SourceCodeSpan,
  kind: HighlightKind,
): ViewerLineSegment[] {
  const { startIndex, endIndex } = sourceSpanToLineSlice(lineText, lineSpan);

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
  span: SourceCodeSpan | null | undefined,
): SourceCodeSpan | null {
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

function sourceSpanToLineSlice(
  lineText: string,
  lineSpan: SourceCodeSpan,
): LineSlice {
  const startIndex = clamp(lineSpan.start_col - 1, 0, lineText.length);

  // JavaScript string.slice(start, end) treats endIndex as exclusive.
  // This keeps the current behavior unchanged while isolating the
  // source-span-to-string-index conversion in one place.
  const endIndex = clamp(lineSpan.end_col, startIndex, lineText.length);

  return { startIndex, endIndex };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
