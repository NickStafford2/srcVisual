import { useEffect, useMemo, useState } from "react";
import type { SrcDiffTreeNode } from "../../srcdiff";

export default function SrcDiffTree({
  root,
  selectedNodeId,
  onSelectNode,
}: {
  root: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const initialExpanded = useMemo(() => {
    if (!root) {
      return new Set<string>();
    }

    const expanded = new Set<string>();
    expanded.add(root.id);
    for (const child of root.children) {
      expanded.add(child.id);
    }
    return expanded;
  }, [root]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);

  useEffect(() => {
    setExpandedIds(initialExpanded);
  }, [initialExpanded]);

  if (!root) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-slate-950/65 px-6 py-8 text-sm text-slate-400 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        Upload or paste a srcdiff file to build the tree view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/65 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-2xl font-semibold text-slate-50">srcDiff Tree</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Select any XML node to highlight its corresponding source span.
        </p>
      </div>
      <div className="max-h-[48vh] overflow-auto px-4 py-4 font-mono text-sm">
        <TreeNodeRow
          node={root}
          depth={0}
          expandedIds={expandedIds}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onToggleNode={(nodeId) =>
            setExpandedIds((current) => {
              const next = new Set(current);
              if (next.has(nodeId)) {
                next.delete(nodeId);
              } else {
                next.add(nodeId);
              }
              return next;
            })
          }
        />
      </div>
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  expandedIds,
  selectedNodeId,
  onSelectNode,
  onToggleNode,
}: {
  node: SrcDiffTreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={[
          "mb-1 flex items-center gap-2 rounded-2xl px-2 py-2 transition",
          isSelected ? "bg-sky-300/15" : "hover:bg-white/5",
        ].join(" ")}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-5 cursor-pointer text-slate-400 hover:text-slate-200"
            onClick={() => onToggleNode(node.id)}
            aria-label={isExpanded ? "Collapse node" : "Expand node"}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-5 text-slate-700">·</span>
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onSelectNode(node.id)}
        >
          <span className={kindClasses(node.kind)}>{node.kind}</span>
          <span className="truncate text-slate-100">{node.label}</span>
          {node.move_id ? <span className="text-xs text-emerald-300">move={node.move_id}</span> : null}
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
              onSelectNode={onSelectNode}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function kindClasses(kind: SrcDiffTreeNode["kind"]): string {
  switch (kind) {
    case "delete":
      return "rounded-full bg-amber-300/20 px-2 py-1 text-[10px] tracking-wide text-amber-100 uppercase";
    case "insert":
      return "rounded-full bg-sky-300/20 px-2 py-1 text-[10px] tracking-wide text-sky-100 uppercase";
    case "move":
      return "rounded-full bg-emerald-300/20 px-2 py-1 text-[10px] tracking-wide text-emerald-100 uppercase";
    default:
      return "rounded-full bg-white/8 px-2 py-1 text-[10px] tracking-wide text-slate-300 uppercase";
  }
}
