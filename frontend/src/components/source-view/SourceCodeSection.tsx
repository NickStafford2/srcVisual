import { useEffect, useState } from "react";
import type { SrcDiffHighlight } from "../../srcdiff/selection";
import type { SrcDiffNodeEntry } from "../../srcdiff/treeIndex";
import type { SrcMoveResults, VisualizedFile } from "../../types";
import { SourceFileCard } from "./SourceFileCard";
import { MoveConnectorOverlay } from "./code-pane/MoveConnectorOverlay";
import { MoveConnectorPopup } from "./code-pane/MoveConnectorPopup";
import { useMoveConnectorOverlay } from "./code-pane/useMoveConnectorOverlay";

type SourceCodeSectionProps = {
  files: VisualizedFile[];
  highlightedSpansByUnitId: Map<number, SrcDiffHighlight[]>;
  moveResults?: SrcMoveResults;
  moveNodesById: Map<string, SrcDiffNodeEntry[]>;
  onHighlightMoveGroup: (nodeId: string) => void;
};

export function SourceCodeSection({
  files,
  highlightedSpansByUnitId,
  moveResults,
  moveNodesById,
  onHighlightMoveGroup,
}: SourceCodeSectionProps) {
  const { containerRef, groups, registerMoveSegment, unregisterMoveSegment } =
    useMoveConnectorOverlay();
  const [pinnedMoves, setPinnedMoves] = useState<
    { moveId: string; x: number; y: number; autoCloseEnabled: boolean }[]
  >([]);
  const [hoveredMove, setHoveredMove] = useState<{
    moveId: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredPopupMoveId, setHoveredPopupMoveId] = useState<string | null>(
    null,
  );

  const pinnedMoveIds = new Set(pinnedMoves.map((move) => move.moveId));
  const activeMoveId = hoveredPopupMoveId ?? hoveredMove?.moveId ?? null;

  useEffect(() => {
    if (pinnedMoves.length === 0) {
      return;
    }

    function _handlePointerDown(event: PointerEvent) {
      const _target = event.target;

      if (!(_target instanceof Element)) {
        setPinnedMoves((current) =>
          current.filter((entry) => !entry.autoCloseEnabled),
        );
        return;
      }

      if (
        _target.closest("[data-move-popup='true']") ||
        _target.closest("[data-move-overlay-hit='true']")
      ) {
        return;
      }

      setPinnedMoves((current) =>
        current.filter((entry) => !entry.autoCloseEnabled),
      );
    }

    document.addEventListener("pointerdown", _handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", _handlePointerDown);
    };
  }, [pinnedMoves.length]);

  return (
    <section
      aria-label="Source Code"
      className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl"
    >
      <div ref={containerRef} className="relative isolate">
        <MoveConnectorOverlay
          groups={groups}
          activeMoveId={activeMoveId}
          onMoveHover={(moveId, event) => {
            setHoveredMove({
              moveId,
              x: event.clientX,
              y: event.clientY,
            });
          }}
          onMoveLeave={() => {
            setHoveredMove(null);
          }}
          onMoveClick={(moveId, event) => {
            setPinnedMoves((current) => {
              const _existingMove = current.find(
                (entry) => entry.moveId === moveId,
              );

              if (_existingMove) {
                return current;
              }

              const _next = current.filter((entry) => entry.moveId !== moveId);

              return [
                ..._next,
                {
                  moveId,
                  x: event.clientX,
                  y: event.clientY,
                  autoCloseEnabled: true,
                },
              ];
            });
          }}
        />

        {moveResults && hoveredMove ? (
          pinnedMoveIds.has(hoveredMove.moveId) ? null : (
            <MoveConnectorPopup
              moveId={hoveredMove.moveId}
              moveResults={moveResults}
              moveNodes={moveNodesById.get(hoveredMove.moveId) ?? []}
              position={{ x: hoveredMove.x, y: hoveredMove.y }}
              active={activeMoveId === hoveredMove.moveId}
              temporary
            />
          )
        ) : null}

        {moveResults
          ? pinnedMoves.map((move) => (
              <MoveConnectorPopup
                key={move.moveId}
                moveId={move.moveId}
                moveResults={moveResults}
                moveNodes={moveNodesById.get(move.moveId) ?? []}
                position={{ x: move.x, y: move.y }}
                active={activeMoveId === move.moveId}
                autoCloseEnabled={move.autoCloseEnabled}
                onHighlightMoveGroup={onHighlightMoveGroup}
                onHoverStart={(moveId) => {
                  setHoveredPopupMoveId(moveId);
                }}
                onHoverEnd={(moveId) => {
                  setHoveredPopupMoveId((current) =>
                    current === moveId ? null : current,
                  );
                }}
                onToggleAutoClose={() => {
                  setPinnedMoves((current) =>
                    current.map((entry) =>
                      entry.moveId === move.moveId
                        ? {
                            ...entry,
                            autoCloseEnabled: !entry.autoCloseEnabled,
                          }
                        : entry,
                    ),
                  );
                }}
                onClose={() => {
                  setPinnedMoves((current) =>
                    current.filter((entry) => entry.moveId !== move.moveId),
                  );
                }}
              />
            ))
          : null}

        <div className="relative z-10 space-y-4">
          {files.map((file, fileIndex) => {
            const highlightedSpans =
              highlightedSpansByUnitId.get(file.unit_id) ?? [];

            return (
              <SourceFileCard
                key={`${file.unit_id}-${file.filename}`}
                fileIndex={fileIndex}
                file={file}
                highlightedSpans={highlightedSpans}
                registerMoveSegment={registerMoveSegment}
                unregisterMoveSegment={unregisterMoveSegment}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
