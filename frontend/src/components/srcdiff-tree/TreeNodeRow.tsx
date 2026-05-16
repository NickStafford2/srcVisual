import { useEffect, useRef, useState } from "react";
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
  highlightedNodeIds: Set<string>;
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

export function TreeNodeRow({
  fileIndex,
  node,
  depth,
  expandedIds,
  highlightedNodeIds,
  onHighlightNode,
  onHighlightMoveGroup,
  onToggleNode,
}: TreeNodeRowProps) {
  const isExpanded = expandedIds.has(node.id);
  const isHighlighted = highlightedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const lineBadges = getNodeLineBadges(node, fileIndex);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <div className="w-full">
      <div
        data-highlight-kind={node.kind}
        data-highlighted={isHighlighted ? "true" : "false"}
        data-node-id={node.id}
        className={[
          "flex items-center gap-1.5 rounded-md transition",
          isHighlighted
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

        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={getTreeNodeKindClasses(node.kind)}>{node.kind}</span>

          <span className="truncate text-sm text-slate-100">{node.label}</span>
        </div>

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

        <div ref={menuRef} className="relative ml-1 shrink-0">
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={`Actions for ${node.label}`}
            onClick={() => setIsMenuOpen((current) => !current)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
          >
            ...
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              aria-label={`${node.label} actions`}
              className="absolute top-full right-0 z-30 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-slate-950/98 p-1.5 shadow-2xl"
            >
              <MenuActionButton
                label="Highlight node"
                onClick={() => {
                  onHighlightNode(node.id);
                  setIsMenuOpen(false);
                }}
              />

              {node.move_id ? (
                <MenuActionButton
                  label="Highlight move group"
                  onClick={() => {
                    onHighlightMoveGroup(node.id);
                    setIsMenuOpen(false);
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
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
              highlightedNodeIds={highlightedNodeIds}
              onHighlightNode={onHighlightNode}
              onHighlightMoveGroup={onHighlightMoveGroup}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-100 transition hover:bg-white/8"
    >
      {label}
    </button>
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
