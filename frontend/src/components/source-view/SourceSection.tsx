import type { VisualizedFile } from "../../types";
import { useSrcDiffHighlight } from "../../srcdiff/highlightContext";
import { SourceFileCard } from "./SourceFileCard";

type SourceSectionProps = {
  files: VisualizedFile[];
  focusedFileIndex: number;
  selectedNodeFileIndex: number | null;
};

export function SourceSection({
  files,
  focusedFileIndex,
  selectedNodeFileIndex,
}: SourceSectionProps) {
  const { highlightedSpans } = useSrcDiffHighlight();

  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="space-y-4">
        {files.map((file, index) => {
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
        })}
      </div>
    </section>
  );
}
