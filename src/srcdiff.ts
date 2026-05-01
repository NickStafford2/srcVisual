export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface Segment {
  text: string;
  kind: HighlightKind;
  moveId?: string;
}

export interface ViewerLine {
  number: number;
  segments: Segment[];
  hasHighlight: boolean;
}

export interface ParsedSrcDiff {
  before: Segment[];
  after: Segment[];
  beforeLines: ViewerLine[];
  afterLines: ViewerLine[];
  summary: {
    deletes: number;
    inserts: number;
    moves: number;
  };
}

interface WalkState {
  beforeEnabled: boolean;
  afterEnabled: boolean;
  beforeKind: HighlightKind;
  afterKind: HighlightKind;
  moveId?: string;
}

const DIFF_DELETE = "diff:delete";
const DIFF_INSERT = "diff:insert";

export function parseSrcDiff(xml: string): ParsedSrcDiff {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(xml, "application/xml");
  const parserError = documentNode.querySelector("parsererror");

  if (parserError) {
    throw new Error(parserError.textContent?.trim() || "Invalid srcDiff XML");
  }

  const before: Segment[] = [];
  const after: Segment[] = [];
  const summary = {
    deletes: 0,
    inserts: 0,
    moves: 0,
  };

  walkNode(documentNode.documentElement, before, after, summary, {
    beforeEnabled: true,
    afterEnabled: true,
    beforeKind: "plain",
    afterKind: "plain",
  });

  const normalizedBefore = normalizeSegments(before);
  const normalizedAfter = normalizeSegments(after);

  return {
    before: normalizedBefore,
    after: normalizedAfter,
    beforeLines: buildLines(normalizedBefore),
    afterLines: buildLines(normalizedAfter),
    summary,
  };
}

function walkNode(
  node: Node,
  before: Segment[],
  after: Segment[],
  summary: ParsedSrcDiff["summary"],
  state: WalkState,
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    appendText(before, after, node.textContent ?? "", state);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  const fullName = element.tagName;

  if (fullName === DIFF_DELETE || fullName === DIFF_INSERT) {
    const moveId = getMoveId(element);
    const highlightKind = moveId ? "move" : fullName === DIFF_DELETE ? "delete" : "insert";

    if (fullName === DIFF_DELETE) {
      summary.deletes += 1;
    } else {
      summary.inserts += 1;
    }

    if (moveId) {
      summary.moves += 1;
    }

    const nextState: WalkState =
      fullName === DIFF_DELETE
        ? {
            beforeEnabled: true,
            afterEnabled: false,
            beforeKind: highlightKind,
            afterKind: state.afterKind,
            moveId,
          }
        : {
            beforeEnabled: false,
            afterEnabled: true,
            beforeKind: state.beforeKind,
            afterKind: highlightKind,
            moveId,
          };

    for (const child of Array.from(element.childNodes)) {
      walkNode(child, before, after, summary, nextState);
    }

    return;
  }

  for (const child of Array.from(element.childNodes)) {
    walkNode(child, before, after, summary, state);
  }
}

function appendText(
  before: Segment[],
  after: Segment[],
  text: string,
  state: WalkState,
): void {
  if (!text) {
    return;
  }

  if (state.beforeEnabled) {
    before.push({
      text,
      kind: state.beforeKind,
      moveId: state.moveId,
    });
  }

  if (state.afterEnabled) {
    after.push({
      text,
      kind: state.afterKind,
      moveId: state.moveId,
    });
  }
}

function normalizeSegments(segments: Segment[]): Segment[] {
  const normalized: Segment[] = [];

  for (const segment of segments) {
    if (!segment.text) {
      continue;
    }

    const previous = normalized[normalized.length - 1];
    if (previous && previous.kind === segment.kind && previous.moveId === segment.moveId) {
      previous.text += segment.text;
      continue;
    }

    normalized.push({ ...segment });
  }

  return normalized;
}

function buildLines(segments: Segment[]): ViewerLine[] {
  const lines: ViewerLine[] = [
    {
      number: 1,
      segments: [],
      hasHighlight: false,
    },
  ];

  for (const segment of segments) {
    const parts = segment.text.split("\n");

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const currentLine = lines[lines.length - 1];

      if (part.length > 0) {
        currentLine.segments.push({
          text: part,
          kind: segment.kind,
          moveId: segment.moveId,
        });
        currentLine.hasHighlight ||= segment.kind !== "plain";
      }

      if (index < parts.length - 1) {
        lines.push({
          number: lines.length + 1,
          segments: [],
          hasHighlight: false,
        });
      }
    }
  }

  return lines;
}

function getMoveId(element: Element): string | undefined {
  return (
    element.getAttribute("move") ||
    element.getAttribute("mv:move") ||
    element.getAttribute("mv:id") ||
    undefined
  );
}
