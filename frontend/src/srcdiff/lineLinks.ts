import type { SourceCodeSpan } from "./types";

export type SourceRevision = "revision-0" | "revision-1";
export const XML_PANE_ID = "srcdiff-xml-pane";

export function buildXmlLineTargetId(lineNumber: number): string {
  return `xml-line-${lineNumber}`;
}

export function buildSourceLineTargetId(
  fileIndex: number,
  revision: SourceRevision,
  lineNumber: number,
): string {
  return `file-${fileIndex}-${revision}-line-${lineNumber}`;
}

export function buildLineHref(targetId: string): string {
  return `#${targetId}`;
}

export function jumpToLineTarget(targetId: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });

  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", buildLineHref(targetId));
  }
}

export function jumpToXmlLineTarget(lineNumber: number): void {
  if (typeof document === "undefined") {
    return;
  }

  const pane = document.getElementById(XML_PANE_ID);
  pane?.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });

  jumpToLineTarget(buildXmlLineTargetId(lineNumber));
}

export function formatLineRange(span: SourceCodeSpan | null | undefined): string | null {
  if (!span) {
    return null;
  }

  if (span.start_line === span.end_line) {
    return `${span.start_line}`;
  }

  return `${span.start_line}-${span.end_line}`;
}
