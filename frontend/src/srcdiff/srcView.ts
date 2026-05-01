import type {
  HighlightKind,
  SourceSpan,
  ViewerLine,
  ViewerLineSegment,
} from "./types";

export function buildSourceView(
  source: string,
  span: SourceSpan | null | undefined,
  kind: HighlightKind,
): ViewerLine[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((line, index) => {
    const lineNumber = index + 1;
    const lineSpan = spanForLine(lineNumber, line, span);

    if (!lineSpan) {
      return {
        number: lineNumber,
        segments: [{ text: line || " ", kind: "plain", highlighted: false }],
        hasHighlight: false,
      };
    }

    return {
      number: lineNumber,
      segments: buildHighlightedSegments(line, lineSpan, kind),
      hasHighlight: true,
    };
  });
}

function buildHighlightedSegments(
  line: string,
  lineSpan: SourceSpan,
  kind: HighlightKind,
): ViewerLineSegment[] {
  const segments: ViewerLineSegment[] = [];

  const startIndex = Math.max(0, Math.min(line.length, lineSpan.start_col - 1));
  const endExclusive = Math.max(
    startIndex,
    Math.min(line.length, lineSpan.end_col),
  );

  if (startIndex > 0) {
    segments.push({
      text: line.slice(0, startIndex),
      kind: "plain",
      highlighted: false,
    });
  }

  segments.push({
    text: line.slice(startIndex, endExclusive) || " ",
    kind,
    highlighted: true,
  });

  if (endExclusive < line.length) {
    segments.push({
      text: line.slice(endExclusive),
      kind: "plain",
      highlighted: false,
    });
  }

  return segments;
}

function spanForLine(
  lineNumber: number,
  line: string,
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
      lineNumber === span.end_line ? span.end_col : Math.max(line.length, 1),
  };
}
