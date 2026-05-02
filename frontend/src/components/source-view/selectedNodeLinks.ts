import {
  buildSourceLineTargetId,
  buildXmlLineTargetId,
  formatLineRange,
} from "../../srcdiff/lineLinks";
import type { SrcDiffSelectionSpans } from "../../srcdiff/selection";

export type SelectedNodeLink = {
  label: string;
  targetId: string;
  title: string;
};

export function buildSelectedNodeLinks(
  selectedSpans: SrcDiffSelectionSpans,
  fileIndex: number,
): SelectedNodeLink[] {
  const links: SelectedNodeLink[] = [];

  if (selectedSpans.xmlSpan) {
    const xmlRange = formatLineRange(selectedSpans.xmlSpan);

    if (xmlRange) {
      links.push({
        label: `XML L${xmlRange}`,
        targetId: buildXmlLineTargetId(selectedSpans.xmlSpan.start_line),
        title: "Jump to selected XML line",
      });
    }
  }

  if (selectedSpans.revision0Span) {
    const revision0Range = formatLineRange(selectedSpans.revision0Span);

    if (revision0Range) {
      links.push({
        label: `Revision 0 L${revision0Range}`,
        targetId: buildSourceLineTargetId(
          fileIndex,
          "revision-0",
          selectedSpans.revision0Span.start_line,
        ),
        title: "Jump to selected revision 0 line",
      });
    }
  }

  if (selectedSpans.revision1Span) {
    const revision1Range = formatLineRange(selectedSpans.revision1Span);

    if (revision1Range) {
      links.push({
        label: `Revision 1 L${revision1Range}`,
        targetId: buildSourceLineTargetId(
          fileIndex,
          "revision-1",
          selectedSpans.revision1Span.start_line,
        ),
        title: "Jump to selected revision 1 line",
      });
    }
  }

  return links;
}
