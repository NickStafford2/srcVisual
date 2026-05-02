import type { SrcDiffTreeNode } from "../../srcdiff/types";

type TreeNodeRowProps = {
  node: SrcDiffTreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

export function TreeNodeRow({
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
  const lineBadges = getNodeLineBadges(node);

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

          {lineBadges.length > 0 ? (
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {lineBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] tracking-wide text-slate-300"
                >
                  {badge.label}
                </span>
              ))}
            </span>
          ) : null}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
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
};

function getNodeLineBadges(node: SrcDiffTreeNode): LineBadge[] {
  const beforeLabel = formatLineRange(node.before_span);
  const afterLabel = formatLineRange(node.after_span);

  if (beforeLabel && afterLabel) {
    if (beforeLabel === afterLabel) {
      return [{ label: `L${beforeLabel}` }];
    }

    return [{ label: `r0 L${beforeLabel}` }, { label: `r1 L${afterLabel}` }];
  }

  if (beforeLabel) {
    return [{ label: `r0 L${beforeLabel}` }];
  }

  if (afterLabel) {
    return [{ label: `r1 L${afterLabel}` }];
  }

  const xmlLabel = formatLineRange(node.xml_span);
  return xmlLabel ? [{ label: `xml L${xmlLabel}` }] : [];
}

function formatLineRange(span: SrcDiffTreeNode["xml_span"]): string | null {
  if (!span) {
    return null;
  }

  if (span.start_line === span.end_line) {
    return `${span.start_line}`;
  }

  return `${span.start_line}-${span.end_line}`;
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
