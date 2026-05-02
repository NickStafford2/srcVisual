import type { VisualizedFile } from "../../types";
import {
  buildLineHref,
  buildSourceLineTargetId,
  buildXmlLineTargetId,
  formatLineRange,
  jumpToLineTarget,
} from "../../srcdiff/lineLinks";
import type {
  SrcDiffHighlight,
  SrcDiffSelectionSpans,
} from "../../srcdiff/selection";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
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

          {selectedNode && selectedNodeFileIndex !== null ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {buildSelectedNodeLinks(selectedSpans, selectedNodeFileIndex).map(
                (link) => (
                  <a
                    key={`${link.targetId}-${link.label}`}
                    href={buildLineHref(link.targetId)}
                    onClick={(event) => {
                      event.preventDefault();
                      jumpToLineTarget(link.targetId);
                    }}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] tracking-wide text-slate-300 transition hover:border-sky-300/30 hover:bg-sky-300/10 hover:text-sky-100"
                    title={link.title}
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          ) : null}

          {highlightedSpans.length > 1 ? (
            <p className="mt-1 text-xs text-emerald-200">
              Highlighting {highlightedSpans.length} move partners with the same
              move id.
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
          selectedSpan={selectedSpans.xmlSpan}
          selectedKind={selectedSpans.kind}
          selectedNodeId={selectedNode?.id ?? null}
          highlights={xmlHighlights}
        />
      </div>

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

type SelectedNodeLink = {
  label: string;
  targetId: string;
  title: string;
};

function buildSelectedNodeLinks(
  selectedSpans: SrcDiffSelectionSpans,
  fileIndex: number,
): SelectedNodeLink[] {
  const links: SelectedNodeLink[] = [];

  if (selectedSpans.xmlSpan) {
    const xmlRange = formatLineRange(selectedSpans.xmlSpan);

    if (xmlRange) {
      links.push({
        label: `XML L${xmlRange}`,
        targetId: buildXmlLineTargetId(selectedSpans.xmlSpan.start_line),
        title: "Jump to selected XML line",
      });
    }
  }

  if (selectedSpans.revision0Span) {
    const revision0Range = formatLineRange(selectedSpans.revision0Span);

    if (revision0Range) {
      links.push({
        label: `Revision 0 L${revision0Range}`,
        targetId: buildSourceLineTargetId(
          fileIndex,
          "revision-0",
          selectedSpans.revision0Span.start_line,
        ),
        title: "Jump to selected revision 0 line",
      });
    }
  }

  if (selectedSpans.revision1Span) {
    const revision1Range = formatLineRange(selectedSpans.revision1Span);

    if (revision1Range) {
      links.push({
        label: `Revision 1 L${revision1Range}`,
        targetId: buildSourceLineTargetId(
          fileIndex,
          "revision-1",
          selectedSpans.revision1Span.start_line,
        ),
        title: "Jump to selected revision 1 line",
      });
    }
  }

  return links;
}
