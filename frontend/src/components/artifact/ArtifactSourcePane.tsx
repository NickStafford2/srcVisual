import { useEffect, useMemo, useState } from "react";
import type {
  ArtifactDiffKind,
  ArtifactDiffOverlayRegion,
  ArtifactFileSummary,
  ArtifactFocusProfile,
  ArtifactMoveSummary,
} from "../../types";
import { MoveConnectorOverlay } from "../source-view/code-pane/MoveConnectorOverlay";
import { DiffRegionOverlay } from "../source-view/code-pane/DiffRegionOverlay";
import { useDiffRegionOverlay } from "../source-view/code-pane/useDiffRegionOverlay";
import { useMoveConnectorOverlay } from "../source-view/code-pane/useMoveConnectorOverlay";
import {
  CorrespondenceSourceContext,
  CorrespondenceOverlay,
} from "./CorrespondenceSource";
import type { Pair } from "./ArtifactCorrespondences";
import { expandReportEndpoints, reportIdsByMember } from "./reportedMoves";
import { ArtifactSourceFile } from "./ArtifactSourceFile";

type Props = {
  artifactId: string;
  files: ArtifactFileSummary[];
  selectedFileId: string;
  selectedNodeId: string | null;
  active: boolean;
  focus: ArtifactFocusProfile;
  inspectedMoveId: string | null;
  moves: ArtifactMoveSummary[];
  visibleMoveIds: ReadonlySet<string>;
  visibleDiffKinds?: ReadonlySet<ArtifactDiffKind>;
  diffOverlayRegions?: ArtifactDiffOverlayRegion[];
  onInspectMove: (moveId: string, position: { x: number; y: number }) => void;
  visibleCorrespondences?: Pair[];
  onInspectCorrespondence?: (
    pair: Pair,
    position: { x: number; y: number },
  ) => void;
  onFocusChange: (focus: ArtifactFocusProfile) => void;
};

export function ArtifactSourcePane({
  artifactId,
  files,
  selectedFileId,
  selectedNodeId,
  active,
  focus,
  inspectedMoveId,
  moves,
  visibleMoveIds,
  visibleDiffKinds = DEFAULT_VISIBLE_DIFF_KINDS,
  diffOverlayRegions = EMPTY_DIFF_REGIONS,
  onInspectMove,
  onFocusChange,
  visibleCorrespondences = EMPTY_PAIRS,
  onInspectCorrespondence = NO_INSPECT,
}: Props) {
  const { containerRef, groups, registerMoveSegment, unregisterMoveSegment } =
    useMoveConnectorOverlay();
  const diffRegionOverlay = useDiffRegionOverlay(diffOverlayRegions);
  const correspondenceOverlay = useMoveConnectorOverlay();
  const correspondenceContext = useMemo(
    () => ({
      pairs: visibleCorrespondences,
      register: correspondenceOverlay.registerMoveSegment,
      unregister: correspondenceOverlay.unregisterMoveSegment,
      inspect: onInspectCorrespondence,
    }),
    [
      visibleCorrespondences,
      correspondenceOverlay.registerMoveSegment,
      correspondenceOverlay.unregisterMoveSegment,
      onInspectCorrespondence,
    ],
  );
  const [hoveredMoveId, setHoveredMoveId] = useState<string | null>(null);
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(
    () => new Set(selectedFileId ? [selectedFileId] : []),
  );
  const [isolatedMoveId, setIsolatedMoveId] = useState<string | null>(null);
  const _reportIds = useMemo(() => reportIdsByMember(moves), [moves]);
  const _inspectedMove = moves.find((move) => move.move_id === inspectedMoveId);
  const _isolatedMove = moves.find((move) => move.move_id === isolatedMoveId);
  const _isolatedMoveFileIds = useMemo(
    () => new Set(_isolatedMove ? moveFileIds(_isolatedMove) : []),
    [_isolatedMove],
  );
  const _visibleMoves = useMemo(
    () => moves.filter((move) => visibleMoveIds.has(move.move_id)).flatMap(expandReportEndpoints),
    [moves, visibleMoveIds],
  );
  const _visibleFiles = _isolatedMove
    ? files.filter((file) => _isolatedMoveFileIds.has(file.file_id))
    : files;

  useEffect(() => {
    if (!selectedFileId) return;
    setExpandedFileIds((current) => new Set(current).add(selectedFileId));
  }, [selectedFileId]);

  useEffect(() => setIsolatedMoveId(null), [artifactId]);

  function toggleFile(fileId: string) {
    setExpandedFileIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  function inspectMove(moveId: string, position: { x: number; y: number }) {
    onInspectMove((_reportIds.get(moveId) ?? moveId), position);
  }

  return (
    <section aria-label="Artifact source" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-neutral-950 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {_isolatedMove
              ? `Move ${_isolatedMove.move_id} isolated · ${_isolatedMoveFileIds.size} file${_isolatedMoveFileIds.size === 1 ? "" : "s"}`
              : `${files.length} changed file${files.length === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs text-slate-400">
            {_isolatedMove
              ? `${visibleMoveIds.size} visible connector${visibleMoveIds.size === 1 ? "" : "s"}; collapsed files remain endpoint proxies`
              : "Expand files to load their source projections"}
          </p>
        </div>
        <label className="text-xs text-slate-300">
          Focus{" "}
          <select
            value={focus}
            onChange={(event) =>
              onFocusChange(event.target.value as ArtifactFocusProfile)
            }
            className="rounded border border-white/15 bg-neutral-900 px-2 py-1 disabled:opacity-60"
          >
            <option value="changes-and-moves">Changes and moves</option>
            <option value="moves">Moves</option>
            <option value="changes">Changes</option>
            <option value="complete-file">Complete file</option>
          </select>
        </label>
        {_inspectedMove ? (
          <button
            type="button"
            disabled={isolatedMoveId === _inspectedMove.move_id}
            onClick={() => setIsolatedMoveId(_inspectedMove.move_id)}
            className="border-diff-move-1/30 bg-diff-move-1/10 rounded border px-2 py-1 text-xs text-amber-200 disabled:opacity-50"
          >
            {isolatedMoveId === _inspectedMove.move_id
              ? "Move isolated"
              : "Isolate inspected move"}
          </button>
        ) : null}
        {_isolatedMove ? (
          <>
            <button
              type="button"
              onClick={() => setIsolatedMoveId(null)}
              className="rounded border border-white/15 bg-neutral-900 px-2 py-1 text-xs text-slate-200"
            >
              Show all files
            </button>
            <button
              type="button"
              onClick={() => setExpandedFileIds(new Set(_isolatedMoveFileIds))}
              className="border-diff-move-1/30 bg-diff-move-1/10 rounded border px-2 py-1 text-xs text-amber-200"
            >
              Reveal isolated endpoints
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setExpandedFileIds(new Set())}
          className="rounded border border-white/15 bg-neutral-900 px-2 py-1 text-xs text-slate-300"
        >
          Collapse all
        </button>
      </div>

      <CorrespondenceSourceContext.Provider value={correspondenceContext}>
        <div
          ref={(element) => {
            containerRef.current = element;
            correspondenceOverlay.containerRef.current = element;
            diffRegionOverlay.containerRef.current = element;
          }}
          className="relative isolate space-y-4"
        >
          <CorrespondenceOverlay
            groups={correspondenceOverlay.groups}
            pairs={visibleCorrespondences}
            inspect={onInspectCorrespondence}
          />
          <DiffRegionOverlay groups={diffRegionOverlay.groups} />
          <MoveConnectorOverlay
            groups={groups.map((group) => ({ ...group, moveId: (_reportIds.get(group.moveId) ?? group.moveId) }))}
            emphasizedMoveId={hoveredMoveId ?? inspectedMoveId}
            onMoveHover={(moveId) => setHoveredMoveId(moveId)}
            onMoveLeave={(moveId) =>
              setHoveredMoveId((current) =>
                current === moveId ? null : current,
              )
            }
            onMoveClick={(moveId, event) => {
              setHoveredMoveId(moveId);
              inspectMove(moveId, { x: event.clientX, y: event.clientY });
            }}
          />

          <div className="relative z-10 space-y-4">
            {_visibleFiles.map((file) => (
              <ArtifactSourceFile
                key={file.file_id}
                artifactId={artifactId}
                file={file}
                focus={focus}
                expanded={expandedFileIds.has(file.file_id)}
                visibleMoves={_visibleMoves}
                visibleDiffKinds={visibleDiffKinds}
                selectedNodeId={selectedNodeId}
                active={active}
                onInspectMove={inspectMove}
                onToggle={() => toggleFile(file.file_id)}
                registerMoveSegment={registerMoveSegment}
                unregisterMoveSegment={unregisterMoveSegment}
              />
            ))}
          </div>
        </div>
      </CorrespondenceSourceContext.Provider>
    </section>
  );
}

function moveFileIds(move: ArtifactMoveSummary): string[] {
  return [
    ...new Set(
      [...move.from_node_ids, ...move.to_node_ids].map(
        (nodeId) => nodeId.split(":n", 1)[0],
      ),
    ),
  ];
}

const EMPTY_PAIRS: Pair[] = [];
const EMPTY_DIFF_REGIONS: ArtifactDiffOverlayRegion[] = [];
const NO_INSPECT = () => {};
const DEFAULT_VISIBLE_DIFF_KINDS = new Set<ArtifactDiffKind>([
  "delete",
  "insert",
]);
