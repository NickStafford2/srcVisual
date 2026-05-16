import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { LineTargetPill } from "../LineTargetPill";
import { getNodeLineBadges } from "./treeNodeLineBadges";

type TreeNodeLineBadgesProps = {
  node: SrcDiffTreeNode;
  fileIndex: number;
};

export function TreeNodeLineBadges({
  node,
  fileIndex,
}: TreeNodeLineBadgesProps) {
  const lineBadges = getNodeLineBadges(node, fileIndex);

  if (lineBadges.length === 0) {
    return null;
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {lineBadges.map((badge) => (
        <LineTargetPill
          key={`${badge.targetId}-${badge.label}`}
          label={badge.label}
          targetId={badge.targetId}
          title={badge.title}
          variant={badge.variant}
          size="compact"
        />
      ))}
    </span>
  );
}
