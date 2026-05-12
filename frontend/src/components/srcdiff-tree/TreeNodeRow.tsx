import {
  buildSourceLineTargetId,
  buildXmlLineTargetId,
  formatLineRange,
} from "../../srcdiff/lineLinks";
import type { SourceCodeSpan, SrcDiffTreeNode } from "../../srcdiff/types";
import { LineTargetPill } from "../LineTargetPill";

type TreeNodeRowProps = {
  fileIndex: number;
  node: SrcDiffTreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

export function TreeNodeRow({
  fileIndex,
  node,
  depth,
  expandedIds,
  selectedNodeId,
  highlightedNodeIds,
  onSelectNode,
  onToggleNode,
}: TreeNodeRowProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const isHighlighted = highlightedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const lineBadges = getNodeLineBadges(node, fileIndex);

  return (
    <div>
      <div
        data-highlight-kind={node.kind}
        data-highlighted={isHighlighted ? "true" : "false"}
        data-node-id={node.id}
        data-selected={isSelected ? "true" : "false"}
        className={[
          "mb-0.5 flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition",
          isSelected
            ? "bg-sky-300/20 ring-1 ring-sky-300/30"
            : isHighlighted
              ? getTreeNodeHighlightClasses(node.kind)
              : "hover:bg-white/5",
        ].join(" ")}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-4 cursor-pointer text-slate-400 hover:text-slate-200"
            onClick={() => onToggleNode(node.id)}
            aria-label={isExpanded ? "Collapse node" : "Expand node"}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 text-slate-700">·</span>
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelectNode(node.id)}
        >
          <span className={getTreeNodeKindClasses(node.kind)}>{node.kind}</span>

          <span className="truncate text-sm text-slate-100">{node.label}</span>

          {node.move_id ? (
            <span className="text-xs text-emerald-300">
              move={node.move_id}
            </span>
          ) : null}
        </button>

        {lineBadges.length > 0 ? (
          <span className="ml-auto flex shrink-0 items-center gap-1 pl-2">
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
        ) : null}
      </div>

      {hasChildren && isExpanded ? (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              fileIndex={fileIndex}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedNodeId={selectedNodeId}
              highlightedNodeIds={highlightedNodeIds}
              onSelectNode={onSelectNode}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type LineBadge = {
  label: string;
  targetId: string;
  title: string;
  variant: "revision-0" | "revision-1" | "xml";
};

function getNodeLineBadges(
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
  const revision0Range = formatLineRange(node.revision_0_span);
  const revision1Range = formatLineRange(node.revision_1_span);

  if (revision0Badge && revision1Badge) {
    if (revision0Range && revision0Range === revision1Range) {
      return [
        {
          label: `L${revision0Range}`,
          targetId: revision0Badge.targetId,
          title: "Jump to revision 0 source line",
          variant: "revision-0",
        },
      ];
    }

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
          label: `xml L${xmlLabel}`,
          targetId: buildXmlLineTargetId(node.xml_span.start_line),
          title: "Jump to XML line",
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
    label: `${revisionLabel} L${lineLabel}`,
    targetId: buildSourceLineTargetId(fileIndex, revision, span.start_line),
    title:
      revision === "revision-0"
        ? "Jump to revision 0 source line"
        : "Jump to revision 1 source line",
    variant: revision,
  };
}

export function getTreeNodeKindClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "rounded-full bg-diff-delete/20 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-delete uppercase";
    case "insert":
      return "rounded-full bg-diff-insert/20 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-insert uppercase";
    case "move":
      return "rounded-full bg-diff-move-1/20 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-move-1 uppercase";
    default:
      return "rounded-full bg-diff-plain/15 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-plain uppercase";
  }
}

function getTreeNodeHighlightClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "bg-diff-delete/12 ring-1 ring-diff-delete/20";
    case "insert":
      return "bg-diff-insert/12 ring-1 ring-diff-insert/20";
    case "move":
      return "bg-diff-move-1/12 ring-1 ring-diff-move-1/20";
    default:
      return "bg-diff-plain/12 ring-1 ring-diff-plain/20";
  }
}
