import type { VisualizedFile } from "../../types";
import type { SrcDiffSelectionSpans } from "../../srcdiff/selection";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { CodePane } from "./CodePane";
import { XmlPane } from "./XmlPane";

type SourceSectionProps = {
  files: VisualizedFile[];
  focusedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  xmlSource: string;
};

const EMPTY_SELECTION_SPANS: SrcDiffSelectionSpans = {
  kind: "plain",
  xmlSpan: null,
  sourceCodeSpanBefore: null,
  sourceCodeSpanAfter: null,
};

export function SourceSection({
  files,
  focusedFileIndex,
  selectedNode,
  selectedNodeFileIndex,
  selectedSpans,
  xmlSource,
}: SourceSectionProps) {
  const selectedFile =
    selectedNodeFileIndex === null ? null : files[selectedNodeFileIndex];

  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">
            XML and source
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-300">
            {selectedNode
              ? `Selected ${selectedNode.label} in ${selectedFile?.filename ?? "unknown file"} at XML path ${selectedNode.path}`
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
        </div>

        {selectedNode?.move_id ? (
          <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200">
            move={selectedNode.move_id}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <XmlPane
          title="srcDiff XML"
          subtitle="Annotated XML returned by the backend"
          source={xmlSource}
          span={selectedSpans.xmlSpan}
          kind={selectedSpans.kind}
        />
      </div>

      <div className="mt-4 space-y-4">
        {files.length === 0 ? (
          <div className="rounded-[20px] border border-white/10 bg-slate-950/45 px-5 py-5 text-sm text-slate-400">
            No source files to render yet.
          </div>
        ) : (
          files.map((file, index) => {
            const fileSpans =
              index === selectedNodeFileIndex
                ? selectedSpans
                : EMPTY_SELECTION_SPANS;

            return (
              <SourceFileCard
                key={`${file.unit}-${file.filename}`}
                file={file}
                isFocused={index === focusedFileIndex}
                isSelectedNodeFile={index === selectedNodeFileIndex}
                selectedSpans={fileSpans}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

type SourceFileCardProps = {
  file: VisualizedFile;
  isFocused: boolean;
  isSelectedNodeFile: boolean;
  selectedSpans: SrcDiffSelectionSpans;
};

function SourceFileCard({
  file,
  isFocused,
  isSelectedNodeFile,
  selectedSpans,
}: SourceFileCardProps) {
  return (
    <article
      className={[
        "rounded-[20px] border p-3 transition",
        isSelectedNodeFile
          ? "border-emerald-300/25 bg-emerald-300/8"
          : isFocused
            ? "border-sky-300/25 bg-sky-300/8"
            : "border-white/10 bg-white/[0.03]",
      ].join(" ")}
    >
      <header className="mb-3 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-50">
            {file.filename}
          </h3>

          <p className="mt-0.5 text-xs text-slate-400">
            unit {file.unit}
            {file.language ? ` · ${file.language}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {isFocused ? (
            <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-xs text-sky-100">
              focused
            </span>
          ) : null}

          {isSelectedNodeFile ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100">
              selected source
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodePane
          title="Revision 0"
          subtitle={`${file.filename} before`}
          source={file.source_code_before}
          sourceCodeSpan={selectedSpans.sourceCodeSpanBefore}
          kind={selectedSpans.kind}
        />

        <CodePane
          title="Revision 1"
          subtitle={`${file.filename} after`}
          source={file.source_code_after}
          sourceCodeSpan={selectedSpans.sourceCodeSpanAfter}
          kind={selectedSpans.kind}
        />
      </div>
    </article>
  );
}
