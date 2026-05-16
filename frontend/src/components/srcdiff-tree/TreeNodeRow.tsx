import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { TreeNodeActionsMenu } from "./TreeNodeActionsMenu";
import { TreeNodeLineBadges } from "./TreeNodeLineBadges";
import {
  getTreeNodeDisplayLabel,
  getTreeNodeHighlightClasses,
  getTreeNodeLabelClasses,
} from "./treeNodeStyles";

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
  const displayLabel = getTreeNodeDisplayLabel(node, depth);

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

        <div className="idems-center flex min-w-0 flex-1 gap-2 text-left">
          <span
            className={[
              "truncate text-sm",
              getTreeNodeLabelClasses(node.kind),
            ].join(" ")}
          >
            {displayLabel}
          </span>
        </div>

        <TreeNodeLineBadges node={node} fileIndex={fileIndex} />

        <TreeNodeActionsMenu
          node={node}
          onHighlightNode={onHighlightNode}
          onHighlightMoveGroup={onHighlightMoveGroup}
        />
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
