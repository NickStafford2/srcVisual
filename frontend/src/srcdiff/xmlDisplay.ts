import type { SourceViewHighlight } from "./srcView";
import type { SourceCodeSpan } from "./types";

const POSITION_ATTRIBUTE_PATTERN =
  /\s(?:pos:(?:start|end)|xmlns:pos)="[^"]*"/g;

type HiddenRange = {
  start: number;
  end: number;
};

type XmlDisplayModel = {
  source: string;
  highlights: SourceViewHighlight[];
};

export function buildXmlDisplayModel(
  source: string,
  highlights: SourceViewHighlight[],
  showPositions: boolean,
): XmlDisplayModel {
  const normalizedSource = source.replace(/\r\n/g, "\n");

  if (showPositions || normalizedSource.length === 0) {
    return {
      source: normalizedSource,
      highlights,
    };
  }

  const lines = normalizedSource.split("\n");
  const hiddenRangesByLine: HiddenRange[][] = [];

  const displayLines = lines.map((lineText) => {
    const { strippedLine, hiddenRanges } = stripPositionAttributes(lineText);
    hiddenRangesByLine.push(hiddenRanges);
    return strippedLine;
  });

  return {
    source: displayLines.join("\n"),
    highlights: highlights.flatMap((highlight) => {
      if (!highlight.span) {
        return [highlight];
      }

      const span = remapSpanForHiddenRanges(
        highlight.span,
        hiddenRangesByLine,
      );

      return span ? [{ ...highlight, span }] : [];
    }),
  };
}

function stripPositionAttributes(lineText: string): {
  strippedLine: string;
  hiddenRanges: HiddenRange[];
} {
  const hiddenRanges: HiddenRange[] = [];

  for (const match of lineText.matchAll(POSITION_ATTRIBUTE_PATTERN)) {
    hiddenRanges.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }

  if (hiddenRanges.length === 0) {
    return {
      strippedLine: lineText,
      hiddenRanges,
    };
  }

  let cursor = 0;
  let strippedLine = "";

  for (const range of hiddenRanges) {
    strippedLine += lineText.slice(cursor, range.start);
    cursor = range.end;
  }

  strippedLine += lineText.slice(cursor);

  return {
    strippedLine,
    hiddenRanges,
  };
}

function remapSpanForHiddenRanges(
  span: SourceCodeSpan,
  hiddenRangesByLine: HiddenRange[][],
): SourceCodeSpan | null {
  const startLineRanges = hiddenRangesByLine[span.start_line - 1] ?? [];
  const endLineRanges = hiddenRangesByLine[span.end_line - 1] ?? [];

  const startIndex = remapBoundaryIndex(span.start_col - 1, startLineRanges);
  const endIndex = remapBoundaryIndex(span.end_col, endLineRanges);

  if (span.start_line === span.end_line && endIndex <= startIndex) {
    return null;
  }

  return {
    ...span,
    start_col: startIndex + 1,
    end_col:
      span.start_line === span.end_line
        ? Math.max(endIndex, startIndex)
        : endIndex,
  };
}

function remapBoundaryIndex(
  originalIndex: number,
  hiddenRanges: HiddenRange[],
): number {
  let adjustedIndex = originalIndex;

  for (const range of hiddenRanges) {
    if (originalIndex >= range.end) {
      adjustedIndex -= range.end - range.start;
      continue;
    }

    if (originalIndex > range.start) {
      adjustedIndex = range.start;
    }

    break;
  }

  return Math.max(adjustedIndex, 0);
}
