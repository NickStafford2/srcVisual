export const SOURCE_TAB_SIZE = 8;

export function renderVisibleWhitespace(
  text: string,
  startColumn = 0,
  tabSize = SOURCE_TAB_SIZE,
): string {
  let column = startColumn;
  let rendered = "";

  for (const character of text) {
    if (character === "\t") {
      const width = tabSize - (column % tabSize);
      rendered += `⇥${" ".repeat(width - 1)}`;
      column += width;
    } else {
      rendered += character === " " ? "·" : character;
      column += 1;
    }
  }

  return rendered;
}

export function sourceColumnAt(
  text: string,
  offset: number,
  tabSize = SOURCE_TAB_SIZE,
): number {
  let column = 0;
  for (const character of text.slice(0, offset)) {
    column +=
      character === "\t" ? tabSize - (column % tabSize) : 1;
  }
  return column;
}
