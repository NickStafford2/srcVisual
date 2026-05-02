import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { TreeNodeRow } from "./TreeNodeRow";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  selectedFileIndex: number;
  selectedNodeId: string | null;
  onSelectFileIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
};

export default function SrcDiffTree({
  files,
  selectedFileIndex,
  selectedNodeId,
  onSelectFileIndex,
  onSelectNode,
}: SrcDiffTreeProps) {
  const initialExpanded = useMemo(() => {
    const ids = new Set<string>();

    for (const file of files) {
      if (!file.tree) continue;

      ids.add(file.tree.id);

      for (const child of file.tree.children) {
        ids.add(child.id);
      }
    }

    return ids;
  }, [files]);

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

  if (files.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-slate-950/65 px-6 py-8 text-sm text-slate-400 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        Upload or paste a srcdiff file to build the tree view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/65 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-2xl font-semibold text-slate-50">srcDiff Forest</h2>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          Each file is rendered as its own tree. Select any XML node to
          highlight its corresponding XML and source spans.
        </p>
      </div>

      <div className="max-h-[56vh] overflow-auto px-4 py-4 font-mono text-sm">
        <div className="space-y-5">
          {files.map((file, index) => (
            <FileTree
              key={`${file.unit}-${file.filename}`}
              file={file}
              fileIndex={index}
              isFocused={index === selectedFileIndex}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onSelectFileIndex={onSelectFileIndex}
              onSelectNode={onSelectNode}
              onToggleNode={handleToggleNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type FileTreeProps = {
  file: VisualizedFile;
  fileIndex: number;
  isFocused: boolean;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onSelectFileIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

function FileTree({
  file,
  fileIndex,
  isFocused,
  selectedNodeId,
  expandedIds,
  onSelectFileIndex,
  onSelectNode,
  onToggleNode,
}: FileTreeProps) {
  return (
    <section
      className={[
        "rounded-3xl border p-3 transition",
        isFocused
          ? "border-sky-300/25 bg-sky-300/8"
          : "border-white/8 bg-white/[0.03]",
      ].join(" ")}
    >
      <button
        type="button"
        className="mb-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-white/5"
        onClick={() => onSelectFileIndex(fileIndex)}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-100">
            {file.filename}
          </span>

          <span className="mt-1 block text-xs text-slate-400">
            unit {file.unit}
            {file.language ? ` · ${file.language}` : ""}
          </span>
        </span>

        {isFocused ? (
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[10px] tracking-wide text-sky-100 uppercase">
            focused
          </span>
        ) : null}
      </button>

      {file.tree ? (
        <TreeNodeRow
          node={file.tree as SrcDiffTreeNode}
          depth={0}
          expandedIds={expandedIds}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onToggleNode={onToggleNode}
        />
      ) : (
        <div className="px-3 py-4 text-sm text-slate-400">
          No tree returned for this file.
        </div>
      )}
    </section>
  );
}
