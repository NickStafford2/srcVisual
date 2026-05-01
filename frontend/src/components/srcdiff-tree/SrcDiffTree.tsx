import { useEffect, useMemo, useState } from "react";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { TreeNodeRow } from "./TreeNodeRow";

type SrcDiffTreeProps = {
  root: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

export default function SrcDiffTree({
  root,
  selectedNodeId,
  onSelectNode,
}: SrcDiffTreeProps) {
  const initialExpanded = useMemo(() => {
    if (!root) return new Set<string>();

    return new Set([root.id, ...root.children.map((child) => child.id)]);
  }, [root]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);

  useEffect(() => {
    setExpandedIds(initialExpanded);
  }, [initialExpanded]);

  function handleToggleNode(nodeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  }

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
          onToggleNode={handleToggleNode}
        />
      </div>
    </div>
  );
}
