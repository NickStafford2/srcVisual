import type { SrcDiffTreeNode } from "../../srcdiff/types";

type TreeNodeRowProps = {
  node: SrcDiffTreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

export function TreeNodeRow({
  node,
  depth,
  expandedIds,
  selectedNodeId,
  onSelectNode,
  onToggleNode,
}: TreeNodeRowProps) {
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
          <span className={getTreeNodeKindClasses(node.kind)}>{node.kind}</span>

          <span className="truncate text-slate-100">{node.label}</span>

          {node.move_id ? (
            <span className="text-xs text-emerald-300">
              move={node.move_id}
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
              onSelectNode={onSelectNode}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function getTreeNodeKindClasses(kind: SrcDiffTreeNode["kind"]): string {
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
