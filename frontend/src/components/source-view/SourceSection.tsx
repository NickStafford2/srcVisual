import type { VisualizedFile } from "../../types";
import type {
  SrcDiffHighlight,
  SrcDiffSelectionSpans,
} from "../../srcdiff/selection";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { SelectedNodeInfo } from "./SelectedNodeInfo";
import { SourceFileCard } from "./SourceFileCard";
import { XmlPane } from "./XmlPane";

type SourceSectionProps = {
  files: VisualizedFile[];
  focusedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  highlightedSpans: SrcDiffHighlight[];
  xmlSource: string;
};

export function SourceSection({
  files,
  focusedFileIndex,
  selectedNode,
  selectedNodeFileIndex,
  selectedSpans,
  highlightedSpans,
  xmlSource,
}: SourceSectionProps) {
  const selectedFile =
    selectedNodeFileIndex === null ? null : files[selectedNodeFileIndex];

  const xmlHighlights: SourceViewHighlight[] = highlightedSpans.flatMap(
    (highlight) => {
      if (!highlight.xmlSpan) return [];

      return [
        {
          nodeId: highlight.nodeId,
          kind: highlight.kind,
          span: highlight.xmlSpan,
        },
      ];
    },
  );

  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <SelectedNodeInfo
        selectedNode={selectedNode}
        selectedFilename={selectedFile?.filename ?? null}
        selectedNodeFileIndex={selectedNodeFileIndex}
        selectedSpans={selectedSpans}
        highlightedCount={highlightedSpans.length}
      />

      <XmlPane
        title="srcDiff XML"
        subtitle="Annotated XML returned by the backend"
        source={xmlSource}
        selectedSpan={selectedSpans.xmlSpan}
        selectedKind={selectedSpans.kind}
        selectedNodeId={selectedNode?.id ?? null}
        highlights={xmlHighlights}
      />

      <div className="mt-4 space-y-4">
        {files.length === 0 ? (
          <div className="rounded-[20px] border border-white/10 bg-slate-950/45 px-5 py-5 text-sm text-slate-400">
            No source files to render yet.
          </div>
        ) : (
          files.map((file, index) => {
            const fileHighlights = highlightedSpans.filter(
              (highlight) => highlight.fileIndex === index,
            );

            return (
              <SourceFileCard
                key={`${file.unit}-${file.filename}`}
                fileIndex={index}
                file={file}
                isFocused={index === focusedFileIndex}
                isSelectedNodeFile={index === selectedNodeFileIndex}
                highlightedSpans={fileHighlights}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
