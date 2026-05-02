import {
  buildLineHref,
  buildSourceLineTargetId,
  buildXmlLineTargetId,
  formatLineRange,
  jumpToLineTarget,
} from "../../srcdiff/lineLinks";
import type { SourceCodeSpan, SrcDiffTreeNode } from "../../srcdiff/types";

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
              <a
                key={`${badge.targetId}-${badge.label}`}
                href={buildLineHref(badge.targetId)}
                onClick={(event) => {
                  event.preventDefault();
                  jumpToLineTarget(badge.targetId);
                }}
                className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] tracking-wide text-slate-300 transition hover:border-sky-300/30 hover:text-sky-100"
                style={getLineBadgeStyle(badge.variant)}
                title={badge.title}
              >
                {badge.label}
              </a>
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
  variant: "before" | "after" | "xml";
};

function getNodeLineBadges(
  node: SrcDiffTreeNode,
  fileIndex: number,
): LineBadge[] {
  const beforeBadge = buildSourceLineBadge(
    node.before_span,
    fileIndex,
    "before",
    "r0",
  );
  const afterBadge = buildSourceLineBadge(
    node.after_span,
    fileIndex,
    "after",
    "r1",
  );
  const beforeRange = formatLineRange(node.before_span);
  const afterRange = formatLineRange(node.after_span);

  if (beforeBadge && afterBadge) {
    if (beforeRange && beforeRange === afterRange) {
      return [
        {
          label: `L${beforeRange}`,
          targetId: beforeBadge.targetId,
          title: "Jump to revision 0 source line",
          variant: "before",
        },
      ];
    }

    return [beforeBadge, afterBadge];
  }

  if (beforeBadge) {
    return [beforeBadge];
  }

  if (afterBadge) {
    return [afterBadge];
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
  revision: "before" | "after",
  revisionLabel: "r0" | "r1",
): LineBadge | null {
  const lineLabel = formatLineRange(span);

  if (!span || !lineLabel) {
    return null;
  }

  return {
    label: `${revisionLabel} L${lineLabel}`,
    targetId: buildSourceLineTargetId(fileIndex, revision, span.start_line),
    title:
      revision === "before"
        ? "Jump to revision 0 source line"
        : "Jump to revision 1 source line",
    variant: revision,
  };
}

function getLineBadgeStyle(variant: LineBadge["variant"]): {
  backgroundImage: string;
} {
  if (variant === "before") {
    return {
      backgroundImage:
        "linear-gradient(90deg, rgb(var(--site-bg-rgb) / 0.96) 0%, rgb(15 23 42 / 0.8) 100%)",
    };
  }

  if (variant === "after") {
    return {
      backgroundImage:
        "linear-gradient(270deg, rgb(var(--site-bg-rgb) / 0.96) 0%, rgb(15 23 42 / 0.8) 100%)",
    };
  }

  return {
    backgroundImage:
      "linear-gradient(90deg, rgb(var(--site-bg-rgb) / 0.52) 0%, rgb(var(--site-bg-rgb) / 0.28) 55%, rgb(15 23 42 / 0.78) 100%)",
  };
}

export function getTreeNodeKindClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "rounded-full bg-red-300/20 px-1.5 py-0.5 text-[9px] tracking-wide text-red-100 uppercase";
    case "insert":
      return "rounded-full bg-sky-300/20 px-1.5 py-0.5 text-[9px] tracking-wide text-sky-100 uppercase";
    case "move":
      return "rounded-full bg-amber-300/20 px-1.5 py-0.5 text-[9px] tracking-wide text-amber-100 uppercase";
    default:
      return "rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] tracking-wide text-slate-300 uppercase";
  }
}

function getTreeNodeHighlightClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "bg-red-300/12 ring-1 ring-red-300/20";
    case "insert":
      return "bg-sky-300/12 ring-1 ring-sky-300/20";
    case "move":
      return "bg-amber-300/12 ring-1 ring-amber-300/20";
    default:
      return "bg-emerald-300/12 ring-1 ring-emerald-300/20";
  }
}
