import { useEffect, useMemo, useState } from "react";
import type {
  ArtifactFileSummary,
  ArtifactFocusProfile,
  ArtifactMoveSummary,
} from "../../types";
import { MoveConnectorOverlay } from "../source-view/code-pane/MoveConnectorOverlay";
import { useMoveConnectorOverlay } from "../source-view/code-pane/useMoveConnectorOverlay";
import { ArtifactSourceFile } from "./ArtifactSourceFile";

type Props = {
  artifactId: string;
  files: ArtifactFileSummary[];
  selectedFileId: string;
  focus: ArtifactFocusProfile;
  activeMove: ArtifactMoveSummary | null;
  onFocusChange: (focus: ArtifactFocusProfile) => void;
};

export function ArtifactSourcePane({
  artifactId,
  files,
  selectedFileId,
  focus,
  activeMove,
  onFocusChange,
}: Props) {
  const { containerRef, groups, registerMoveSegment, unregisterMoveSegment } =
    useMoveConnectorOverlay();
  const [hoveredMoveId, setHoveredMoveId] = useState<string | null>(null);
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(
    () => new Set(selectedFileId ? [selectedFileId] : []),
  );
  const [showMoveFilesOnly, setShowMoveFilesOnly] = useState(false);
  const _moveFocused = activeMove !== null;
  const _moveFileIds = useMemo(
    () => new Set(activeMove ? moveFileIds(activeMove) : []),
    [activeMove],
  );
  const _visibleFiles =
    showMoveFilesOnly && activeMove
      ? files.filter((file) => _moveFileIds.has(file.file_id))
      : files;

  useEffect(() => {
    if (!selectedFileId) return;
    setExpandedFileIds((current) => new Set(current).add(selectedFileId));
  }, [selectedFileId]);

  useEffect(() => {
    setShowMoveFilesOnly(activeMove !== null);
  }, [activeMove]);

  function toggleFile(fileId: string) {
    setExpandedFileIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  return (
    <section aria-label="Artifact source" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-neutral-950 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {_moveFocused
              ? `Move ${activeMove.move_id} · ${_moveFileIds.size} file${_moveFileIds.size === 1 ? "" : "s"}`
              : `${files.length} changed file${files.length === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs text-slate-400">
            {_moveFocused
              ? "Expanded code regions and collapsed-file endpoint proxies"
              : "Expand files to load their source projections"}
          </p>
        </div>
        <label className="text-xs text-slate-300">
          Focus{" "}
          <select
            value={focus}
            disabled={_moveFocused}
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
        {_moveFocused ? (
          <>
            <button
              type="button"
              aria-pressed={showMoveFilesOnly}
              onClick={() => setShowMoveFilesOnly((current) => !current)}
              className="rounded border border-white/15 bg-neutral-900 px-2 py-1 text-xs text-slate-200"
            >
              {showMoveFilesOnly ? "Selected move files" : "All files"}
            </button>
            <button
              type="button"
              onClick={() => setExpandedFileIds(new Set(_moveFileIds))}
              className="rounded border border-diff-move-1/30 bg-diff-move-1/10 px-2 py-1 text-xs text-amber-200"
            >
              Reveal all endpoints
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

      <div ref={containerRef} className="relative isolate space-y-4">
        <MoveConnectorOverlay
          groups={groups}
          activeMoveId={hoveredMoveId ?? activeMove?.move_id ?? null}
          onMoveHover={(moveId) => setHoveredMoveId(moveId)}
          onMoveLeave={(moveId) =>
            setHoveredMoveId((current) => (current === moveId ? null : current))
          }
          onMoveClick={(moveId) => setHoveredMoveId(moveId)}
        />

        <div className="relative z-10 space-y-4">
          {_visibleFiles.map((file) => (
            <ArtifactSourceFile
              key={file.file_id}
              artifactId={artifactId}
              file={file}
              focus={focus}
              expanded={expandedFileIds.has(file.file_id)}
              activeMove={activeMove}
              onToggle={() => toggleFile(file.file_id)}
              registerMoveSegment={registerMoveSegment}
              unregisterMoveSegment={unregisterMoveSegment}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function moveFileIds(move: ArtifactMoveSummary): string[] {
  return [
    ...new Set(
      [...move.from_node_ids, ...move.to_node_ids].map((nodeId) =>
        nodeId.split(":n", 1)[0],
      ),
    ),
  ];
}
