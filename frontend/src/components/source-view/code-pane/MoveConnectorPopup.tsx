import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SrcMoveResults } from "../../../types";
import type { MoveNodeEntry } from "../node-info/moveInfo";
import { MoveSummaryCard } from "../node-info/MoveSummaryCard";

type PopupPosition = {
  x: number;
  y: number;
};

type MoveConnectorPopupProps = {
  moveId: string;
  moveResults: SrcMoveResults;
  moveNodes: MoveNodeEntry[];
  position: PopupPosition;
  temporary?: boolean;
  autoCloseEnabled?: boolean;
  onHighlightMoveGroup?: (nodeId: string) => void;
  onToggleAutoClose?: () => void;
  onClose?: () => void;
};

const POPUP_WIDTH = 460;
const VIEWPORT_PADDING = 12;
const CURSOR_OFFSET = 18;
const MIN_BOTTOM_SPACE = 240;

type PopupWindowPosition = {
  left: number;
  top: number;
};

export function MoveConnectorPopup({
  moveId,
  moveResults,
  moveNodes,
  position,
  temporary = false,
  autoCloseEnabled = true,
  onHighlightMoveGroup,
  onToggleAutoClose,
  onClose,
}: MoveConnectorPopupProps) {
  const [_windowPosition, _setWindowPosition] = useState<PopupWindowPosition>(
    () => buildPopupPosition(position),
  );
  const [_dragState, _setDragState] = useState<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!_dragState) {
      return;
    }

    const _activeDragState = _dragState;

    function _handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== _activeDragState.pointerId) {
        return;
      }

      _setWindowPosition({
        ...clampPopupPosition({
          left: event.clientX - _activeDragState.offsetX,
          top: event.clientY - _activeDragState.offsetY,
        }),
      });
    }

    function _handlePointerEnd(event: PointerEvent) {
      if (event.pointerId !== _activeDragState.pointerId) {
        return;
      }

      _setDragState(null);
    }

    window.addEventListener("pointermove", _handlePointerMove);
    window.addEventListener("pointerup", _handlePointerEnd);
    window.addEventListener("pointercancel", _handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", _handlePointerMove);
      window.removeEventListener("pointerup", _handlePointerEnd);
      window.removeEventListener("pointercancel", _handlePointerEnd);
    };
  }, [_dragState]);

  useEffect(() => {
    if (temporary) {
      return;
    }

    function _handleResize() {
      _setWindowPosition((_current) => clampPopupPosition(_current));
    }

    window.addEventListener("resize", _handleResize);

    return () => {
      window.removeEventListener("resize", _handleResize);
    };
  }, [temporary]);

  const _popupPosition = temporary
    ? buildPopupPosition(position)
    : _windowPosition;

  const _popup = (
    <div
      data-move-popup="true"
      className={[
        "fixed z-50 w-[460px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/96 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl",
        temporary ? "pointer-events-none" : "",
      ].join(" ")}
      style={_popupPosition}
    >
      <div
        className={[
          "flex items-center justify-between border-b border-white/10 bg-white/[0.05] px-4 py-2.5",
          temporary ? "" : _dragState ? "cursor-grabbing" : "cursor-grab",
        ].join(" ")}
        style={temporary ? undefined : { touchAction: "none" }}
        onPointerDown={
          temporary
            ? undefined
            : (event) => {
                _setDragState({
                  pointerId: event.pointerId,
                  offsetX: event.clientX - _popupPosition.left,
                  offsetY: event.clientY - _popupPosition.top,
                });
              }
        }
      >
        <span className="text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">
          Move Window
        </span>

        {!temporary ? (
          <div className="flex items-center gap-2">
            {onToggleAutoClose ? (
              <button
                type="button"
                aria-pressed={!autoCloseEnabled}
                aria-label={
                  autoCloseEnabled
                    ? `Disable auto close for move ${moveId}`
                    : `Enable auto close for move ${moveId}`
                }
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={onToggleAutoClose}
                className={[
                  "rounded-lg border px-2 py-1 text-xs font-semibold transition",
                  autoCloseEnabled
                    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20",
                ].join(" ")}
              >
                {autoCloseEnabled ? "Auto-close" : "Manual close"}
              </button>
            ) : null}

            {onClose ? (
              <button
                type="button"
                aria-label={`Close move ${moveId}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                X
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <MoveSummaryCard
        moveId={moveId}
        moveResults={moveResults}
        moveNodes={moveNodes}
        embedded
        onHighlightMoveGroup={temporary ? undefined : onHighlightMoveGroup}
      />
    </div>
  );

  if (typeof document === "undefined") {
    return _popup;
  }

  return createPortal(_popup, document.body);
}

function buildPopupPosition(position: PopupPosition): PopupWindowPosition {
  return clampPopupPosition({
    left: position.x + CURSOR_OFFSET,
    top: position.y + CURSOR_OFFSET,
  });
}

function clampPopupPosition(
  position: PopupWindowPosition,
): PopupWindowPosition {
  if (typeof window === "undefined") {
    return position;
  }

  const _maxLeft = window.innerWidth - POPUP_WIDTH - VIEWPORT_PADDING;
  const _left = clamp(
    position.left,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, _maxLeft),
  );
  const _top = clamp(
    position.top,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, window.innerHeight - MIN_BOTTOM_SPACE),
  );

  return {
    left: _left,
    top: _top,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
