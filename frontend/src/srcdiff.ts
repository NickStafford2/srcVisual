export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface ViewerLine {
  number: number;
  text: string;
  kind: HighlightKind;
  hasHighlight: boolean;
}

interface DiffRow {
  before?: string;
  after?: string;
  kind: HighlightKind;
}

export function alignSources(beforeSource: string, afterSource: string): {
  beforeLines: ViewerLine[];
  afterLines: ViewerLine[];
} {
  const before = splitLines(beforeSource);
  const after = splitLines(afterSource);
  const rows = buildAlignedRows(before, after);

  let beforeLineNumber = 0;
  let afterLineNumber = 0;

  return {
    beforeLines: rows.map((row) => {
      if (row.before !== undefined) {
        beforeLineNumber += 1;
      }

      return {
        number: row.before !== undefined ? beforeLineNumber : 0,
        text: row.before ?? "",
        kind: row.kind === "insert" ? "plain" : row.kind,
        hasHighlight: row.kind !== "plain",
      };
    }),
    afterLines: rows.map((row) => {
      if (row.after !== undefined) {
        afterLineNumber += 1;
      }

      return {
        number: row.after !== undefined ? afterLineNumber : 0,
        text: row.after ?? "",
        kind: row.kind === "delete" ? "plain" : row.kind,
        hasHighlight: row.kind !== "plain",
      };
    }),
  };
}

function splitLines(source: string): string[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function buildAlignedRows(before: string[], after: string[]): DiffRow[] {
  const rows: DiffRow[] = [];
  const lcs = buildLcsTable(before, after);

  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < before.length && afterIndex < after.length) {
    if (before[beforeIndex] === after[afterIndex]) {
      rows.push({
        before: before[beforeIndex],
        after: after[afterIndex],
        kind: "plain",
      });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (lcs[beforeIndex + 1][afterIndex] >= lcs[beforeIndex][afterIndex + 1]) {
      rows.push({
        before: before[beforeIndex],
        kind: "delete",
      });
      beforeIndex += 1;
      continue;
    }

    rows.push({
      after: after[afterIndex],
      kind: "insert",
    });
    afterIndex += 1;
  }

  while (beforeIndex < before.length) {
    rows.push({
      before: before[beforeIndex],
      kind: "delete",
    });
    beforeIndex += 1;
  }

  while (afterIndex < after.length) {
    rows.push({
      after: after[afterIndex],
      kind: "insert",
    });
    afterIndex += 1;
  }

  return coalesceChangedRows(rows);
}

function buildLcsTable(before: string[], after: string[]): number[][] {
  const table = Array.from({ length: before.length + 1 }, () => Array<number>(after.length + 1).fill(0));

  for (let beforeIndex = before.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
      if (before[beforeIndex] === after[afterIndex]) {
        table[beforeIndex][afterIndex] = table[beforeIndex + 1][afterIndex + 1] + 1;
      } else {
        table[beforeIndex][afterIndex] = Math.max(
          table[beforeIndex + 1][afterIndex],
          table[beforeIndex][afterIndex + 1],
        );
      }
    }
  }

  return table;
}

function coalesceChangedRows(rows: DiffRow[]): DiffRow[] {
  const merged: DiffRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const next = rows[index + 1];

    if (row.kind === "delete" && next?.kind === "insert") {
      merged.push({
        before: row.before,
        after: next.after,
        kind: "move",
      });
      index += 1;
      continue;
    }

    if (row.kind === "insert" && next?.kind === "delete") {
      merged.push({
        before: next.before,
        after: row.after,
        kind: "move",
      });
      index += 1;
      continue;
    }

    merged.push(row);
  }

  return merged;
}
