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
  onHighlightMoveGroup?: (nodeId: string) => void;
  onClose?: () => void;
};

const POPUP_WIDTH = 460;
const VIEWPORT_PADDING = 12;
const CURSOR_OFFSET = 18;

export function MoveConnectorPopup({
  moveId,
  moveResults,
  moveNodes,
  position,
  temporary = false,
  onHighlightMoveGroup,
  onClose,
}: MoveConnectorPopupProps) {
  const _style = buildPopupStyle(position);

  return (
    <div
      className={[
        "fixed z-50 w-[460px] max-w-[calc(100vw-24px)]",
        temporary ? "pointer-events-none" : "",
      ].join(" ")}
      style={_style}
    >
      <MoveSummaryCard
        moveId={moveId}
        moveResults={moveResults}
        moveNodes={moveNodes}
        onHighlightMoveGroup={temporary ? undefined : onHighlightMoveGroup}
        onClose={temporary ? undefined : onClose}
        className="bg-slate-950/96 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      />
    </div>
  );
}

function buildPopupStyle(position: PopupPosition) {
  if (typeof window === "undefined") {
    return {
      left: position.x + CURSOR_OFFSET,
      top: position.y + CURSOR_OFFSET,
    };
  }

  const _maxLeft = window.innerWidth - POPUP_WIDTH - VIEWPORT_PADDING;
  const _left = clamp(
    position.x + CURSOR_OFFSET,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, _maxLeft),
  );
  const _top = clamp(
    position.y + CURSOR_OFFSET,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, window.innerHeight - 240),
  );

  return {
    left: _left,
    top: _top,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
