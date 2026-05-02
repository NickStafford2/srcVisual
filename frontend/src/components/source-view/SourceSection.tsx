import type { VisualizedFile } from "../../types";
import type { SrcDiffHighlight } from "../../srcdiff/selection";
import { SourceFileCard } from "./SourceFileCard";

type SourceSectionProps = {
  files: VisualizedFile[];
  focusedFileIndex: number;
  selectedNodeFileIndex: number | null;
  highlightedSpans: SrcDiffHighlight[];
};

export function SourceSection({
  files,
  focusedFileIndex,
  selectedNodeFileIndex,
  highlightedSpans,
}: SourceSectionProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="space-y-4">
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
