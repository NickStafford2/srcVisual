import {
  buildSourceLineTargetId,
  buildXmlLineTargetId,
  formatLineRange,
} from "../../srcdiff/lineLinks";
import type { SourceCodeSpan, SrcDiffTreeNode } from "../../srcdiff/types";

export type LineBadge = {
  label: string;
  targetId: string;
  title: string;
  variant: "revision-0" | "revision-1" | "xml";
};

export function getNodeLineBadges(
  node: SrcDiffTreeNode,
  fileIndex: number,
): LineBadge[] {
  const revision0Badge = buildSourceLineBadge(
    node.revision_0_span,
    fileIndex,
    "revision-0",
    "Revision 0",
  );
  const revision1Badge = buildSourceLineBadge(
    node.revision_1_span,
    fileIndex,
    "revision-1",
    "Revision 1",
  );

  if (revision0Badge && revision1Badge) {
    return [revision0Badge, revision1Badge];
  }

  if (revision0Badge) {
    return [revision0Badge];
  }

  if (revision1Badge) {
    return [revision1Badge];
  }

  const xmlLabel = formatLineRange(node.xml_span);
  return node.xml_span && xmlLabel
    ? [
        {
          label: "xml",
          targetId: buildXmlLineTargetId(node.xml_span.start_line),
          title: `XML L${xmlLabel}`,
          variant: "xml",
        },
      ]
    : [];
}

function buildSourceLineBadge(
  span: SourceCodeSpan | null | undefined,
  fileIndex: number,
  revision: "revision-0" | "revision-1",
  revisionLabel: "Revision 0" | "Revision 1",
): LineBadge | null {
  const lineLabel = formatLineRange(span);

  if (!span || !lineLabel) {
    return null;
  }

  return {
    label: revision === "revision-0" ? "r0" : "r1",
    targetId: buildSourceLineTargetId(fileIndex, revision, span.start_line),
    title: `${revisionLabel} L${lineLabel}`,
    variant: revision,
  };
}
