import type { MoveConnectorGroup } from "./_moveConnectorGeometry";

const INACTIVE_BOX_FILL_OPACITY = 0.12;
const ACTIVE_BOX_FILL_OPACITY = 0.18;
const INACTIVE_STROKE_OPACITY = 0.72;
const ACTIVE_STROKE_OPACITY = 0.96;
const INACTIVE_BOX_STROKE_WIDTH = 1.5;
const ACTIVE_BOX_STROKE_WIDTH = 2;

type MoveConnectorOverlayProps = {
  groups: MoveConnectorGroup[];
  activeMoveId?: string | null;
  onMoveHover?: (
    moveId: string,
    event: React.MouseEvent<SVGElement>,
  ) => void;
  onMoveLeave?: (moveId: string) => void;
  onMoveClick?: (
    moveId: string,
    event: React.MouseEvent<SVGElement>,
  ) => void;
};

export function MoveConnectorOverlay({
  groups,
  activeMoveId = null,
  onMoveHover,
  onMoveLeave,
  onMoveClick,
}: MoveConnectorOverlayProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible">
      {groups.map((group) => {
        const _isActive = activeMoveId === group.moveId;
        const _strokeOpacity = _isActive
          ? ACTIVE_STROKE_OPACITY
          : INACTIVE_STROKE_OPACITY;
        const _fillOpacity = _isActive
          ? ACTIVE_BOX_FILL_OPACITY
          : INACTIVE_BOX_FILL_OPACITY;
        const _boxStrokeWidth = _isActive
          ? ACTIVE_BOX_STROKE_WIDTH
          : INACTIVE_BOX_STROKE_WIDTH;

        return (
          <g key={group.key} className="text-diff-move-1/70">
            {group.boxes.map((box) => (
              <rect
                key={box.key}
                data-move-overlay-box="true"
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                rx={box.rx}
                fill="currentColor"
                fillOpacity={_fillOpacity}
                stroke="currentColor"
                strokeOpacity={_strokeOpacity}
                strokeWidth={_boxStrokeWidth}
                className="drop-shadow"
              />
            ))}

            {group.paths.map((path) => (
              <g key={path.key}>
                <path
                  data-move-overlay-line="true"
                  d={path.d}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={_strokeOpacity}
                  strokeWidth={_isActive ? 3.5 : 2}
                  className="drop-shadow"
                />
                <path
                  d={path.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  data-move-overlay-hit="true"
                  className="pointer-events-auto cursor-pointer"
                  onMouseEnter={(event) => onMoveHover?.(group.moveId, event)}
                  onMouseMove={(event) => onMoveHover?.(group.moveId, event)}
                  onMouseLeave={() => onMoveLeave?.(group.moveId)}
                  onClick={(event) => onMoveClick?.(group.moveId, event)}
                />
              </g>
            ))}

            {group.hub ? (
              <>
                <circle
                  data-move-overlay-hub="true"
                  cx={group.hub.cx}
                  cy={group.hub.cy}
                  r={group.hub.r}
                  fill="currentColor"
                  fillOpacity={_strokeOpacity}
                  className="drop-shadow"
                />
                <circle
                  cx={group.hub.cx}
                  cy={group.hub.cy}
                  r={group.hub.hitR}
                  fill="transparent"
                  data-move-overlay-hit="true"
                  className="pointer-events-auto cursor-pointer"
                  onMouseEnter={(event) => onMoveHover?.(group.moveId, event)}
                  onMouseMove={(event) => onMoveHover?.(group.moveId, event)}
                  onMouseLeave={() => onMoveLeave?.(group.moveId)}
                  onClick={(event) => onMoveClick?.(group.moveId, event)}
                />
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
