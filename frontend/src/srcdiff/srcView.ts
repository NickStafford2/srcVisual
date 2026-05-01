import type {
  HighlightKind,
  SourceSpan,
  SrcDiffTreeNode,
  ViewerLine,
  ViewerLineSegment,
} from "./types";

type BuildInteractiveSourceViewArgs = {
  source: string;
  root: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  getSpan: (node: SrcDiffTreeNode) => SourceSpan | null | undefined;
};

type FlatNode = {
  node: SrcDiffTreeNode;
  depth: number;
};

type LineNodeSpan = {
  node: SrcDiffTreeNode;
  depth: number;
  startIndex: number;
  endExclusive: number;
  spanSize: number;
};

export function buildInteractiveSourceView({
  source,
  root,
  selectedNodeId,
  getSpan,
}: BuildInteractiveSourceViewArgs): ViewerLine[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const flatNodes = root ? flattenTree(root) : [];

  return lines.map((line, index) => {
    const lineNumber = index + 1;

    const lineNodeSpans = flatNodes
      .map(({ node, depth }) => {
        const span = getSpan(node);
        const lineSpan = spanForLine(lineNumber, line, span);

        if (!lineSpan) return null;

        return {
          node,
          depth,
          startIndex: Math.max(
            0,
            Math.min(line.length, lineSpan.start_col - 1),
          ),
          endExclusive: Math.max(0, Math.min(line.length, lineSpan.end_col)),
          spanSize: getSpanSize(span),
        };
      })
      .filter((item): item is LineNodeSpan => item !== null);

    const selectedLineSpan =
      selectedNodeId === null
        ? null
        : (lineNodeSpans.find((span) => span.node.id === selectedNodeId) ??
          null);

    const segments = buildInteractiveSegments({
      line,
      lineNodeSpans,
      selectedLineSpan,
    });

    return {
      number: lineNumber,
      segments,
      hasHighlight: segments.some((segment) => segment.highlighted),
    };
  });
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

    return {
      number: lineNumber,
      segments: buildHighlightedSegments(line, lineSpan, kind),
      hasHighlight: true,
    };
  });
}

function buildInteractiveSegments({
  line,
  lineNodeSpans,
  selectedLineSpan,
}: {
  line: string;
  lineNodeSpans: LineNodeSpan[];
  selectedLineSpan: LineNodeSpan | null;
}): ViewerLineSegment[] {
  if (line.length === 0) {
    const nodeSpan = getBestNodeSpanForRange(0, 0, lineNodeSpans);

    return [
      {
        text: " ",
        kind: selectedLineSpan?.node.kind ?? nodeSpan?.node.kind ?? "plain",
        highlighted: selectedLineSpan !== null,
        nodeId: nodeSpan?.node.id ?? null,
      },
    ];
  }

  const boundaries = new Set<number>([0, line.length]);

  for (const span of lineNodeSpans) {
    boundaries.add(span.startIndex);
    boundaries.add(span.endExclusive);
  }

  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
  const segments: ViewerLineSegment[] = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const startIndex = sortedBoundaries[index];
    const endExclusive = sortedBoundaries[index + 1];

    if (startIndex === endExclusive) continue;

    const nodeSpan = getBestNodeSpanForRange(
      startIndex,
      endExclusive,
      lineNodeSpans,
    );

    const selected =
      selectedLineSpan !== null &&
      startIndex >= selectedLineSpan.startIndex &&
      endExclusive <= selectedLineSpan.endExclusive;

    segments.push({
      text: line.slice(startIndex, endExclusive),
      kind: selected
        ? selectedLineSpan.node.kind
        : (nodeSpan?.node.kind ?? "plain"),
      highlighted: selected,
      nodeId: nodeSpan?.node.id ?? null,
    });
  }

  return segments.length > 0
    ? segments
    : [{ text: " ", kind: "plain", highlighted: false, nodeId: null }];
}

function getBestNodeSpanForRange(
  startIndex: number,
  endExclusive: number,
  spans: LineNodeSpan[],
): LineNodeSpan | null {
  const matchingSpans = spans.filter(
    (span) =>
      startIndex >= span.startIndex && endExclusive <= span.endExclusive,
  );

  if (matchingSpans.length === 0) {
    return null;
  }

  return matchingSpans.sort((left, right) => {
    if (left.spanSize !== right.spanSize) {
      return left.spanSize - right.spanSize;
    }

    return right.depth - left.depth;
  })[0];
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

function flattenTree(root: SrcDiffTreeNode): FlatNode[] {
  const nodes: FlatNode[] = [];

  function visit(node: SrcDiffTreeNode, depth: number) {
    nodes.push({ node, depth });

    for (const child of node.children) {
      visit(child, depth + 1);
    }
  }

  visit(root, 0);

  return nodes;
}

function getSpanSize(span: SourceSpan | null | undefined): number {
  if (!span) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    (span.end_line - span.start_line) * 100_000 +
    Math.max(0, span.end_col - span.start_col)
  );
}
