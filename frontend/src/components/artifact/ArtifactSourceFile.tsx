import { useEffect, useState } from "react";
import { fetchArtifactSource } from "../../api";
import type { SourceRevision } from "../../srcdiff/lineLinks";
import type {
  ArtifactFileSummary,
  ArtifactFocusProfile,
  ArtifactSourceLine,
  ArtifactSourceProjection,
} from "../../types";
import { CodeSegment } from "../source-view/code-pane/CodeSegment";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "../source-view/code-pane/moveConnectors";
import { buildArtifactLineSegments } from "./artifactSourceSegments";

type Props = {
  artifactId: string;
  file: ArtifactFileSummary;
  focus: ArtifactFocusProfile;
  registerMoveSegment: RegisterMoveSegment;
  unregisterMoveSegment: UnregisterMoveSegment;
};

export function ArtifactSourceFile({
  artifactId,
  file,
  focus,
  registerMoveSegment,
  unregisterMoveSegment,
}: Props) {
  const [projection, setProjection] =
    useState<ArtifactSourceProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRanges, setExpandedRanges] = useState<
    { left?: { start: number; end: number }; right?: { start: number; end: number } }[]
  >([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setExpandedRanges([]);
    void fetchArtifactSource(artifactId, file.file_id, focus)
      .then((result) => {
        if (active) setProjection(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artifactId, file.file_id, focus]);

  async function showGap(
    block: Extract<
      NonNullable<typeof projection>["blocks"][number],
      { type: "gap" }
    >,
  ) {
    setLoading(true);
    setError(null);
    try {
      const nextRanges = [
        ...expandedRanges,
        {
          left: boundedRange(block.left.start_line, block.left.end_line),
          right: boundedRange(block.right.start_line, block.right.end_line),
        },
      ];
      const result = await fetchArtifactSource(
        artifactId,
        file.file_id,
        focus,
        nextRanges,
      );
      setProjection(result);
      setExpandedRanges(nextRanges);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function returnToFocus() {
    setLoading(true);
    try {
      setProjection(await fetchArtifactSource(artifactId, file.file_id, focus));
      setExpandedRanges([]);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      aria-label={`Artifact source file ${file.filename}`}
      className="overflow-hidden rounded-xl border border-white/10 bg-black"
    >
      <header className="flex items-center gap-3 border-b border-white/10 bg-neutral-950 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-200">
            {file.filename}
          </p>
          <p className="text-[11px] text-slate-500">
            {file.revision_0_filename} → {file.revision_1_filename}
          </p>
        </div>
        {expandedRanges.length > 0 ? (
          <button
            type="button"
            onClick={() => void returnToFocus()}
            className="rounded border border-sky-300/30 px-3 py-1 text-xs text-sky-200"
          >
            Collapse expanded gaps
          </button>
        ) : null}
      </header>

      {loading ? <p className="p-3 text-sm text-slate-400">Loading source…</p> : null}
      {error ? <p className="p-3 text-sm text-rose-300">{error}</p> : null}
      {projection ? (
        <div className="overflow-auto bg-black font-mono text-xs">
          {projection.blocks.map((block) =>
            block.type === "gap" ? (
              <button
                key={block.block_id}
                type="button"
                onClick={() => void showGap(block)}
                className="block w-full border-y border-sky-400/20 bg-neutral-950 px-3 py-2 text-left text-sky-300 hover:bg-slate-900"
              >
                Show {block.left.line_count} left / {block.right.line_count} right hidden lines
              </button>
            ) : (
              <div key={block.block_id}>
                {block.rows.map((row, index) => (
                  <div
                    key={`${block.block_id}-${index}`}
                    className={`grid grid-cols-2 border-b border-white/5 ${rowClass(row.kind)}`}
                  >
                    <SourceCell
                      line={row.left}
                      revision="revision-0"
                      registerMoveSegment={registerMoveSegment}
                      unregisterMoveSegment={unregisterMoveSegment}
                    />
                    <SourceCell
                      line={row.right}
                      revision="revision-1"
                      registerMoveSegment={registerMoveSegment}
                      unregisterMoveSegment={unregisterMoveSegment}
                    />
                  </div>
                ))}
              </div>
            ),
          )}
          {projection.truncated ? (
            <p className="px-3 py-2 text-amber-300">
              This projection reached the 2,000-row response bound. Expand a gap to inspect another range.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function SourceCell({
  line,
  revision,
  registerMoveSegment,
  unregisterMoveSegment,
}: {
  line: ArtifactSourceLine | null;
  revision: SourceRevision;
  registerMoveSegment: RegisterMoveSegment;
  unregisterMoveSegment: UnregisterMoveSegment;
}) {
  const _segments = line ? buildArtifactLineSegments(line) : [];

  return (
    <div className="grid min-h-7 grid-cols-[3.5rem_1fr] border-r border-white/10">
      <span className="select-none px-2 py-1 text-right text-slate-600">
        {line?.line_number ?? ""}
      </span>
      <code className="whitespace-pre px-2 py-1 text-slate-200">
        {_segments.map((segment, index) => (
          <CodeSegment
            key={`${segment.nodeId ?? "plain"}-${index}`}
            revision={revision}
            segment={segment}
            registerMoveSegment={registerMoveSegment}
            unregisterMoveSegment={unregisterMoveSegment}
          />
        ))}
      </code>
    </div>
  );
}

function boundedRange(start: number | null, end: number | null) {
  if (start === null || end === null) return undefined;
  return { start, end: Math.min(end, start + 1_999) };
}

function rowClass(kind: string) {
  if (kind === "delete") return "bg-rose-950/25";
  if (kind === "insert") return "bg-emerald-950/25";
  if (kind === "replace") return "bg-amber-950/10";
  return "bg-black";
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Unable to load source projection.";
}
