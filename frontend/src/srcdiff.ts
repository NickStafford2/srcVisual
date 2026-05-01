export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface SourceSpan {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface SrcDiffTreeNode {
  id: string;
  path: string;
  tag: string;
  label: string;
  kind: HighlightKind;
  move_id?: string | null;
  before_span?: SourceSpan | null;
  after_span?: SourceSpan | null;
  children: SrcDiffTreeNode[];
}

export interface ViewerLineSegment {
  text: string;
  kind: HighlightKind;
  highlighted: boolean;
}

export interface ViewerLine {
  number: number;
  segments: ViewerLineSegment[];
  hasHighlight: boolean;
}

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

    const segments: ViewerLineSegment[] = [];
    const startIndex = Math.max(0, Math.min(line.length, lineSpan.start_col - 1));
    const endExclusive = Math.max(startIndex, Math.min(line.length, lineSpan.end_col));

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

    return {
      number: lineNumber,
      segments,
      hasHighlight: true,
    };
  });
}

export function findTreeNodeById(
  node: SrcDiffTreeNode | null | undefined,
  id: string | null,
): SrcDiffTreeNode | null {
  if (!node || !id) {
    return null;
  }

  if (node.id === id) {
    return node;
  }

  for (const child of node.children) {
    const match = findTreeNodeById(child, id);
    if (match) {
      return match;
    }
  }

  return null;
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

  const startCol = lineNumber === span.start_line ? span.start_col : 1;
  const endCol = lineNumber === span.end_line ? span.end_col : Math.max(line.length, 1);
  return {
    start_line: lineNumber,
    start_col: startCol,
    end_line: lineNumber,
    end_col: endCol,
  };
}
