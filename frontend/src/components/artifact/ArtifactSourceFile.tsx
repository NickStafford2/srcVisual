import { useEffect, useMemo, useRef, useState } from "react";
import { fetchArtifactSource } from "../../api";
import type { SourceRevision } from "../../srcdiff/lineLinks";
import type {
  ArtifactFileSummary,
  ArtifactFocusProfile,
  ArtifactMoveSummary,
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
  expanded: boolean;
  visibleMoves: ArtifactMoveSummary[];
  selectedNodeId: string | null;
  active: boolean;
  onSelectMove: (moveId: string) => void;
  onToggle: () => void;
  registerMoveSegment: RegisterMoveSegment;
  unregisterMoveSegment: UnregisterMoveSegment;
};

export function ArtifactSourceFile({
  artifactId,
  file,
  focus,
  expanded,
  visibleMoves,
  selectedNodeId,
  active,
  onSelectMove,
  onToggle,
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
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
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
  }, [artifactId, expanded, file.file_id, focus]);

  useEffect(() => {
    if (!active || !expanded || !projection || !selectedNodeId) return;
    const target = Array.from(
      articleRef.current?.querySelectorAll<HTMLElement>("[data-node-id]") ?? [],
    ).find((element) => element.dataset.nodeId === selectedNodeId);
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [active, expanded, projection, selectedNodeId]);

  const _hasCollapsedEndpoints = visibleMoves.some(
    (move) =>
      endpointCount(move.from_node_ids, file.file_id) > 0 ||
      endpointCount(move.to_node_ids, file.file_id) > 0,
  );
  const _visibleMoveIds = useMemo(
    () => new Set(visibleMoves.map((move) => move.move_id)),
    [visibleMoves],
  );

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
      ref={articleRef}
      aria-label={`Artifact source file ${file.filename}`}
      className="overflow-hidden rounded-xl border border-white/10 bg-black"
    >
      <header className="border-b border-white/10 bg-neutral-950">
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="w-3 text-slate-500">{expanded ? "▾" : "▸"}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-200">
                {file.filename}
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                {file.revision_0_filename} → {file.revision_1_filename}
              </span>
            </span>
          </button>
          <span className="text-[11px] text-slate-500">
            {file.revision_0_lines} → {file.revision_1_lines} lines
          </span>
          {expandedRanges.length > 0 && expanded ? (
            <button
              type="button"
              onClick={() => void returnToFocus()}
              className="rounded border border-sky-300/30 px-3 py-1 text-xs text-sky-200"
            >
              Collapse expanded gaps
            </button>
          ) : null}
        </div>
        {!expanded && _hasCollapsedEndpoints ? (
          <div className="grid grid-cols-2 border-t border-white/5">
            <div className="space-y-1 px-3 py-1.5 text-xs text-slate-500">
              {visibleMoves.map((move) => (
                <CollapsedMoveAnchor
                  key={`${move.move_id}-from`}
                  fileId={file.file_id}
                  moveId={move.move_id}
                  revision="revision-0"
                  count={endpointCount(move.from_node_ids, file.file_id)}
                  label="from"
                  registerMoveSegment={registerMoveSegment}
                  unregisterMoveSegment={unregisterMoveSegment}
                />
              ))}
            </div>
            <div className="space-y-1 px-3 py-1.5 text-xs text-slate-500">
              {visibleMoves.map((move) => (
                <CollapsedMoveAnchor
                  key={`${move.move_id}-to`}
                  fileId={file.file_id}
                  moveId={move.move_id}
                  revision="revision-1"
                  count={endpointCount(move.to_node_ids, file.file_id)}
                  label="to"
                  registerMoveSegment={registerMoveSegment}
                  unregisterMoveSegment={unregisterMoveSegment}
                />
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {expanded && loading ? <p className="p-3 text-sm text-slate-400">Loading source…</p> : null}
      {expanded && error ? <p className="p-3 text-sm text-rose-300">{error}</p> : null}
      {expanded && projection ? (
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
                      visibleMoveIds={_visibleMoveIds}
                      selectedNodeId={selectedNodeId}
                      onSelectMove={onSelectMove}
                      registerMoveSegment={registerMoveSegment}
                      unregisterMoveSegment={unregisterMoveSegment}
                    />
                    <SourceCell
                      line={row.right}
                      revision="revision-1"
                      visibleMoveIds={_visibleMoveIds}
                      selectedNodeId={selectedNodeId}
                      onSelectMove={onSelectMove}
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
  visibleMoveIds,
  selectedNodeId,
  onSelectMove,
  registerMoveSegment,
  unregisterMoveSegment,
}: {
  line: ArtifactSourceLine | null;
  revision: SourceRevision;
  visibleMoveIds: ReadonlySet<string>;
  selectedNodeId: string | null;
  onSelectMove: (moveId: string) => void;
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
            visibleMoveIds={visibleMoveIds}
            selected={segment.nodeId === selectedNodeId}
            onMoveSelect={onSelectMove}
            registerMoveSegment={registerMoveSegment}
            unregisterMoveSegment={unregisterMoveSegment}
          />
        ))}
      </code>
    </div>
  );
}

function CollapsedMoveAnchor({
  fileId,
  moveId,
  revision,
  count,
  label,
  registerMoveSegment,
  unregisterMoveSegment,
}: {
  fileId: string;
  moveId: string;
  revision: SourceRevision;
  count: number;
  label: string;
  registerMoveSegment: RegisterMoveSegment;
  unregisterMoveSegment: UnregisterMoveSegment;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (count === 0 || !ref.current) return;
    const element = ref.current;
    const endpointId = `collapsed:${fileId}:${revision}`;
    registerMoveSegment({ moveId, endpointId, revision, element });
    return () => {
      unregisterMoveSegment({ moveId, endpointId, revision, element });
    };
  }, [
    count,
    fileId,
    moveId,
    registerMoveSegment,
    revision,
    unregisterMoveSegment,
  ]);

  return (
    count > 0 ? (
      <span
        ref={ref}
        className="block rounded border border-dashed border-diff-move-1/50 bg-diff-move-1/10 px-2 py-0.5 text-amber-200"
      >
        {moveId}: {count} hidden {label} endpoint{count === 1 ? "" : "s"}
      </span>
    ) : null
  );
}

function endpointCount(nodeIds: string[], fileId: string) {
  return nodeIds.filter((nodeId) => nodeId.startsWith(`${fileId}:n`)).length;
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
