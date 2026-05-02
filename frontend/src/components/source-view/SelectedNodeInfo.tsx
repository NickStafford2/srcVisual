import { useSrcDiffHighlight } from "../../srcdiff/highlightContext";
import type { SrcDiffSelectionSpans } from "../../srcdiff/selection";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { LineTargetPill } from "../LineTargetPill";
import { buildSelectedNodeLinks } from "./selectedNodeLinks";

type SelectedNodeInfoProps = {
  selectedNode: SrcDiffTreeNode | null;
  selectedFilename: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
};

export function SelectedNodeInfo({
  selectedNode,
  selectedFilename,
  selectedNodeFileIndex,
  selectedSpans,
}: SelectedNodeInfoProps) {
  const { highlightedSpans } = useSrcDiffHighlight();
  const highlightedCount = highlightedSpans.length;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mt-1 text-sm leading-5 text-slate-300">
          {selectedNode
            ? `Selected ${selectedNode.label} in ${selectedFilename ?? "unknown file"} at XML path ${selectedNode.path}`
            : "Select a tree node to highlight its XML and source spans."}
        </p>

        {selectedNode ? (
          <p className="mt-1 font-mono text-xs text-slate-400">
            xml_span:{" "}
            {selectedSpans.xmlSpan
              ? `${selectedSpans.xmlSpan.start_line}:${selectedSpans.xmlSpan.start_col} → ${selectedSpans.xmlSpan.end_line}:${selectedSpans.xmlSpan.end_col}`
              : "missing"}
          </p>
        ) : null}

        {selectedNode && selectedNodeFileIndex !== null ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {buildSelectedNodeLinks(selectedSpans, selectedNodeFileIndex).map(
              (link) => (
                <LineTargetPill
                  key={`${link.targetId}-${link.label}`}
                  label={link.label}
                  targetId={link.targetId}
                  title={link.title}
                  variant={link.variant}
                />
              ),
            )}
          </div>
        ) : null}

        {highlightedCount > 1 ? (
          <p className="mt-1 text-xs text-emerald-200">
            Highlighting {highlightedCount} move partners with the same move id.
          </p>
        ) : null}
      </div>

      {selectedNode?.move_id ? (
        <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200">
          move={selectedNode.move_id}
        </span>
      ) : null}
    </div>
  );
}
