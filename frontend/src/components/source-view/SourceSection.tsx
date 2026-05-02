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
    <section className="rounded-[24px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">
            XML and source
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-300">
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
          <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200">
            move={selectedNode.move_id}
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        <XmlPane
          title="srcDiff XML"
          subtitle="Annotated XML returned by the backend"
          source={xmlSource}
          span={selectedSpans.xmlSpan}
          kind={selectedSpans.kind}
        />
      </div>

      <div className="mt-6 space-y-6">
        {files.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-950/45 px-6 py-8 text-sm text-slate-400">
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
        "rounded-[28px] border p-4 transition",
        isSelectedNodeFile
          ? "border-emerald-300/25 bg-emerald-300/8"
          : isFocused
            ? "border-sky-300/25 bg-sky-300/8"
            : "border-white/10 bg-white/[0.03]",
      ].join(" ")}
    >
      <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">
            {file.filename}
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            unit {file.unit}
            {file.language ? ` · ${file.language}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isFocused ? (
            <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs text-sky-100">
              focused file
            </span>
          ) : null}

          {isSelectedNodeFile ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100">
              selected node source
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
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
