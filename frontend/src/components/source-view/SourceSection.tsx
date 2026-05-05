import type { SrcMoveResults, VisualizedFile } from "../../types";
import type { SrcDiffHighlight } from "../../srcdiff/selection";
import { SourceFileCard } from "./SourceFileCard";

type SourceSectionProps = {
  files: VisualizedFile[];
  focusedFileIndex: number;
  selectedNodeFileIndex: number | null;
  highlightedSpansByUnitId: Map<number, SrcDiffHighlight[]>;
  moveResults?: SrcMoveResults;
};

export function SourceSection({
  files,
  focusedFileIndex,
  selectedNodeFileIndex,
  highlightedSpansByUnitId,
  moveResults,
}: SourceSectionProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="space-y-4">
        {files.map((file, fileIndex) => {
          const highlightedSpans =
            highlightedSpansByUnitId.get(file.unit_id) ?? [];

          return (
            <SourceFileCard
              key={`${file.unit_id}-${file.filename}`}
              fileIndex={fileIndex}
              file={file}
              isFocused={fileIndex === focusedFileIndex}
              isSelectedNodeFile={fileIndex === selectedNodeFileIndex}
              highlightedSpans={highlightedSpans}
              moveResults={moveResults}
            />
          );
        })}
      </div>
    </section>
  );
}
