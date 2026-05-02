export function renderVisibleWhitespace(text: string): string {
  return text.replace(/ /g, "·").replace(/\t/g, "⇥");
}
