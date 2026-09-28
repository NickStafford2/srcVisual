import {
  CorrespondenceSourceContext,
  CorrespondenceSpan,
  type CorrespondenceEndpoint,
} from "./CorrespondenceSource";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
  onInspectMove: (moveId: string, position: { x: number; y: number }) => void;
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
  onInspectMove,
  onToggle,
  registerMoveSegment,
  unregisterMoveSegment,
}: Props) {
  const [projection, setProjection] = useState<ArtifactSourceProjection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRanges, setExpandedRanges] = useState<
    {
      left?: { start: number; end: number };
      right?: { start: number; end: number };
    }[]
  >([]);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setLoading(true);
    setError(null);
    setProjection(null);
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

  const correspondenceContext = useContext(CorrespondenceSourceContext);
  const correspondenceEndpoints = (correspondenceContext?.pairs ?? []).flatMap(
    (pair) =>
      [
        {
          pair,
          revision: "revision-0" as const,
          location: pair.before_location,
        },
        {
          pair,
          revision: "revision-1" as const,
          location: pair.after_location,
        },
      ].filter(
        (endpoint) =>
          endpoint.location?.file_id === file.file_id && endpoint.location.span,
      ),
  );
  const renderedCorrespondences = correspondenceEndpoints.filter((endpoint) => {
    if (!expanded || !projection) return false;
    const numbers = new Set(
      projection.blocks.flatMap((block) =>
        block.type === "hunk"
          ? block.rows.flatMap((row) => {
              const line =
                endpoint.revision === "revision-0" ? row.left : row.right;
              return line ? [line.line_number] : [];
            })
          : [],
      ),
    );
    const span = endpoint.location.span!;
    for (let line = span.start_line; line <= span.end_line; line++)
      if (!numbers.has(line)) return false;
    return true;
  });
  const _visibleMoveIds = useMemo(
    () => new Set(visibleMoves.map((move) => move.move_id)),
    [visibleMoves],
  );
  const _renderedNodeIds = useMemo(
    () => (expanded && projection ? renderedMoveNodeIds(projection) : null),
    [expanded, projection],
  );
  const _endpointProxies = visibleMoves.map((move) => ({
    move,
    fromCount: proxyEndpointCount(
      move.from_node_ids,
      file.file_id,
      _renderedNodeIds?.["revision-0"],
    ),
    toCount: proxyEndpointCount(
      move.to_node_ids,
      file.file_id,
      _renderedNodeIds?.["revision-1"],
    ),
  }));
  const _hasEndpointProxies = _endpointProxies.some(
    ({ fromCount, toCount }) => fromCount > 0 || toCount > 0,
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
        {expanded ? (
          <div className="grid grid-cols-2 border-t border-white/10 text-[11px] text-slate-400">
            <div className="border-r border-white/10 px-3 py-1.5 break-all">
              <strong className="text-slate-200">Before</strong> ·{" "}
              {file.revision_0_filename || "File absent"}
            </div>
            <div className="px-3 py-1.5 break-all">
              <strong className="text-slate-200">After</strong> ·{" "}
              {file.revision_1_filename || "File absent"}
            </div>
          </div>
        ) : null}
        {_hasEndpointProxies ? (
          <div className="grid grid-cols-2 border-t border-white/5">
            <div className="space-y-1 px-3 py-1.5 text-xs text-slate-500">
              {_endpointProxies.map(({ move, fromCount }) => (
                <MoveEndpointProxy
                  key={`${move.move_id}-from`}
                  fileId={file.file_id}
                  moveId={move.move_id}
                  revision="revision-0"
                  count={fromCount}
                  label="from"
                  reason={expanded ? "unrendered" : "hidden"}
                  registerMoveSegment={registerMoveSegment}
                  unregisterMoveSegment={unregisterMoveSegment}
                />
              ))}
            </div>
            <div className="space-y-1 px-3 py-1.5 text-xs text-slate-500">
              {_endpointProxies.map(({ move, toCount }) => (
                <MoveEndpointProxy
                  key={`${move.move_id}-to`}
                  fileId={file.file_id}
                  moveId={move.move_id}
                  revision="revision-1"
                  count={toCount}
                  label="to"
                  reason={expanded ? "unrendered" : "hidden"}
                  registerMoveSegment={registerMoveSegment}
                  unregisterMoveSegment={unregisterMoveSegment}
                />
              ))}
            </div>
          </div>
        ) : null}
        {correspondenceEndpoints
          .filter((endpoint) => !renderedCorrespondences.includes(endpoint))
          .map((endpoint) => (
            <div
              key={`${endpoint.pair.id}:${endpoint.revision}`}
              className="px-3 py-1 text-xs"
            >
              <CorrespondenceSpan endpoints={[endpoint]} proxy>
                ● Pair {endpoint.pair.id + 1} ·{" "}
                {endpoint.revision === "revision-0" ? "Before" : "After"}{" "}
                endpoint hidden · expand file/gaps to reveal
              </CorrespondenceSpan>
            </div>
          ))}
      </header>

      {expanded && loading ? (
        <p className="p-3 text-sm text-slate-400">Loading source…</p>
      ) : null}
      {expanded && error ? (
        <p className="p-3 text-sm text-rose-300">{error}</p>
      ) : null}
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
                Show {block.left.line_count} left / {block.right.line_count}{" "}
                right hidden lines
              </button>
            ) : (
              <div key={block.block_id}>
                {block.rows.map((row, index) => (
                  <div
                    key={`${block.block_id}-${index}`}
                    data-source-row-kind={row.kind}
                    className="grid grid-cols-2 border-b border-white/5 bg-black"
                  >
                    <SourceCell
                      correspondenceEndpoints={renderedCorrespondences}
                      line={row.left}
                      revision="revision-0"
                      visibleMoveIds={_visibleMoveIds}
                      selectedNodeId={selectedNodeId}
                      onInspectMove={onInspectMove}
                      registerMoveSegment={registerMoveSegment}
                      unregisterMoveSegment={unregisterMoveSegment}
                    />
                    <SourceCell
                      correspondenceEndpoints={renderedCorrespondences}
                      line={row.right}
                      revision="revision-1"
                      visibleMoveIds={_visibleMoveIds}
                      selectedNodeId={selectedNodeId}
                      onInspectMove={onInspectMove}
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
              This projection reached the 2,000-row response bound. Expand a gap
              to inspect another range.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function SourceCell({
  correspondenceEndpoints,
  line,
  revision,
  visibleMoveIds,
  selectedNodeId,
  onInspectMove,
  registerMoveSegment,
  unregisterMoveSegment,
}: {
  correspondenceEndpoints: CorrespondenceEndpoint[];
  line: ArtifactSourceLine | null;
  revision: SourceRevision;
  visibleMoveIds: ReadonlySet<string>;
  selectedNodeId: string | null;
  onInspectMove: (moveId: string, position: { x: number; y: number }) => void;
  registerMoveSegment: RegisterMoveSegment;
  unregisterMoveSegment: UnregisterMoveSegment;
}) {
  const originalSegments = line ? buildArtifactLineSegments(line) : [];
  const endpoints = correspondenceEndpoints.filter(
    (endpoint) =>
      endpoint.revision === revision &&
      line &&
      line.line_number >= endpoint.location.span!.start_line &&
      line.line_number <= endpoint.location.span!.end_line,
  );
  const columnOffset = (column: number) =>
    Array.from(line?.text ?? "")
      .slice(0, column)
      .join("").length;
  let offset = 0;
  const _segments = originalSegments.flatMap((segment) => {
    const start = offset;
    offset += segment.text.length;
    const bounds = [
      ...new Set([
        start,
        offset,
        ...endpoints
          .flatMap((endpoint) => {
            const span = endpoint.location.span!;
            return [
              line!.line_number === span.start_line
                ? columnOffset(span.start_col - 1)
                : 0,
              line!.line_number === span.end_line
                ? columnOffset(span.end_col)
                : line!.text.length,
            ];
          })
          .filter((n) => n > start && n < offset),
      ]),
    ].sort((a, b) => a - b);
    return bounds.slice(0, -1).map((left, i) => ({
      segment: {
        ...segment,
        text: segment.text.slice(left - start, bounds[i + 1] - start),
      },
      endpoints: endpoints.filter((endpoint) => {
        const span = endpoint.location.span!;
        const right = bounds[i + 1];
        return (
          (line!.line_number !== span.start_line ||
            left >= columnOffset(span.start_col - 1)) &&
          (line!.line_number !== span.end_line ||
            right <= columnOffset(span.end_col))
        );
      }),
    }));
  });

  return (
    <div className="grid min-h-7 grid-cols-[3.5rem_1fr] border-r border-white/10">
      <span className="px-2 py-1 text-right text-slate-600 select-none">
        {line?.line_number ?? ""}
      </span>
      <code className="px-2 py-1 whitespace-pre text-slate-200">
        {_segments.map(({ segment, endpoints }, index) => (
          <CorrespondenceSpan
            key={`${segment.nodeId ?? "plain"}-${index}`}
            endpoints={endpoints}
          >
            <CodeSegment
              revision={revision}
              segment={segment}
              visibleMoveIds={visibleMoveIds}
              selected={
                selectedNodeId !== null && segment.nodeId === selectedNodeId
              }
              onMoveInspect={onInspectMove}
              registerMoveSegment={registerMoveSegment}
              unregisterMoveSegment={unregisterMoveSegment}
            />
          </CorrespondenceSpan>
        ))}
      </code>
    </div>
  );
}

function MoveEndpointProxy({
  fileId,
  moveId,
  revision,
  count,
  label,
  reason,
  registerMoveSegment,
  unregisterMoveSegment,
}: {
  fileId: string;
  moveId: string;
  revision: SourceRevision;
  count: number;
  label: string;
  reason: "hidden" | "unrendered";
  registerMoveSegment: RegisterMoveSegment;
  unregisterMoveSegment: UnregisterMoveSegment;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (count === 0 || !ref.current) return;
    const element = ref.current;
    const endpointId = `proxy:${fileId}:${revision}`;
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

  return count > 0 ? (
    <span
      ref={ref}
      className="border-diff-move-1/50 bg-diff-move-1/10 block rounded border border-dashed px-2 py-0.5 text-amber-200"
    >
      {moveId}: {count} {reason} {label} endpoint{count === 1 ? "" : "s"}
    </span>
  ) : null;
}

function proxyEndpointCount(
  nodeIds: string[],
  fileId: string,
  renderedNodeIds: ReadonlySet<string> | undefined,
) {
  return nodeIds.filter(
    (nodeId) =>
      nodeId.startsWith(`${fileId}:n`) && !renderedNodeIds?.has(nodeId),
  ).length;
}

function renderedMoveNodeIds(projection: ArtifactSourceProjection): {
  "revision-0": Set<string>;
  "revision-1": Set<string>;
} {
  const result = {
    "revision-0": new Set<string>(),
    "revision-1": new Set<string>(),
  };

  for (const block of projection.blocks) {
    if (block.type !== "hunk") continue;
    for (const row of block.rows) {
      collectRenderedMoveNodeIds(row.left, result["revision-0"]);
      collectRenderedMoveNodeIds(row.right, result["revision-1"]);
    }
  }

  return result;
}

function collectRenderedMoveNodeIds(
  line: ArtifactSourceLine | null,
  nodeIds: Set<string>,
) {
  if (!line) return;
  for (const segment of buildArtifactLineSegments(line)) {
    if (segment.kind === "move" && segment.moveId && segment.nodeId) {
      nodeIds.add(segment.nodeId);
    }
  }
}

function boundedRange(start: number | null, end: number | null) {
  if (start === null || end === null) return undefined;
  return { start, end: Math.min(end, start + 1_999) };
}

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Unable to load source projection.";
}
