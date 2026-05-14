import { useMemo } from "react";
import type { SrcDiffHighlight } from "../../srcdiff/selection";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type { SrcMoveResults, VisualizedFile } from "../../types";
import { CodePane } from "./code-pane/CodePane";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./code-pane/moveConnectors";
import { buildMoveTooltipInfoById } from "./code-pane/MoveTooltip";

type SourceFileCardProps = {
  fileIndex: number;
  file: VisualizedFile;
  highlightedSpans: SrcDiffHighlight[];
  moveResults?: SrcMoveResults;
  registerMoveSegment?: RegisterMoveSegment;
  unregisterMoveSegment?: UnregisterMoveSegment;
};

export function SourceFileCard({
  fileIndex,
  file,
  highlightedSpans,
  moveResults,
  registerMoveSegment,
  unregisterMoveSegment,
}: SourceFileCardProps) {
  const moveTooltipInfoById = useMemo(
    () => buildMoveTooltipInfoById(moveResults?.moves ?? []),
    [moveResults?.moves],
  );

  for (const highlight of highlightedSpans) {
    if (highlight.unitId !== file.unit_id) {
      throw new Error(
        `Highlight unit mismatch for ${file.filename}: expected unit_id=${file.unit_id}, got unit_id=${highlight.unitId}.`,
      );
    }

    if (highlight.filename !== file.filename) {
      throw new Error(
        `Highlight filename mismatch for unit_id=${file.unit_id}: expected "${file.filename}", got "${highlight.filename}".`,
      );
    }
  }

  const revision0Highlights: SourceViewHighlight[] = highlightedSpans.flatMap(
    (highlight) => {
      if (!highlight.revision0Span) return [];

      return [
        {
          nodeId: highlight.nodeId,
          moveId: highlight.moveId,
          kind: highlight.kind,
          span: highlight.revision0Span,
        },
      ];
    },
  );

  const revision1Highlights: SourceViewHighlight[] = highlightedSpans.flatMap(
    (highlight) => {
      if (!highlight.revision1Span) return [];

      return [
        {
          nodeId: highlight.nodeId,
          moveId: highlight.moveId,
          kind: highlight.kind,
          span: highlight.revision1Span,
        },
      ];
    },
  );

  return (
    <article
      aria-label={`Source file ${file.filename}`}
      data-file-name={file.filename}
      className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3 transition"
    >
      <header className="mb-3 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-50">
            {file.filename}
          </h3>

          <p className="mt-0.5 text-xs text-slate-400">
            unit {file.unit_id}
            {file.language ? ` · ${file.language}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {highlightedSpans.length > 0 ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100">
              {highlightedSpans.length} highlighted
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodePane
          fileIndex={fileIndex}
          filename={file.filename}
          revision="revision-0"
          title="Revision 0"
          subtitle={`${file.filename} revision 0`}
          source={file.revision_0_source_code}
          highlights={revision0Highlights}
          registerMoveSegment={registerMoveSegment}
          unregisterMoveSegment={unregisterMoveSegment}
          moveTooltipInfoById={moveTooltipInfoById}
        />

        <CodePane
          fileIndex={fileIndex}
          filename={file.filename}
          revision="revision-1"
          title="Revision 1"
          subtitle={`${file.filename} revision 1`}
          source={file.revision_1_source_code}
          highlights={revision1Highlights}
          registerMoveSegment={registerMoveSegment}
          unregisterMoveSegment={unregisterMoveSegment}
          moveTooltipInfoById={moveTooltipInfoById}
        />
      </div>
    </article>
  );
}
