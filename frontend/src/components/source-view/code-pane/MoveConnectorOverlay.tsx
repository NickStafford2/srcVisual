import type { MoveConnectorGroup } from "./_moveConnectorGeometry";

const INACTIVE_BOX_FILL_OPACITY = 0.12;
const ACTIVE_BOX_FILL_OPACITY = 0.18;
const INACTIVE_STROKE_OPACITY = 0.72;
const ACTIVE_STROKE_OPACITY = 0.96;
const INACTIVE_BOX_STROKE_WIDTH = 1.5;
const ACTIVE_BOX_STROKE_WIDTH = 2;
const BOX_BORDER_HIT_WIDTH = 12;
const EDGE_FADE_OPACITY = 0.28;
const MID_FADE_OPACITY = 0.92;

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
      <defs>
        {groups.flatMap((group) =>
          group.boxes.map((box) => {
            const _gradientId = buildBoxStrokeMaskGradientId(box.key);
            const _maskId = buildBoxStrokeMaskId(box.key);
            const _startOpacity =
              box.revision === "revision-0" ? EDGE_FADE_OPACITY : 1;
            const _endOpacity =
              box.revision === "revision-1" ? EDGE_FADE_OPACITY : 1;

            return (
              <g key={box.key}>
                <linearGradient
                  id={_gradientId}
                  gradientUnits="userSpaceOnUse"
                  x1={box.x}
                  y1={box.y}
                  x2={box.x + box.width}
                  y2={box.y}
                >
                  <stop offset="0%" stopColor="white" stopOpacity={_startOpacity} />
                  <stop offset="35%" stopColor="white" stopOpacity={MID_FADE_OPACITY} />
                  <stop offset="65%" stopColor="white" stopOpacity={MID_FADE_OPACITY} />
                  <stop offset="100%" stopColor="white" stopOpacity={_endOpacity} />
                </linearGradient>
                <mask
                  id={_maskId}
                  maskUnits="userSpaceOnUse"
                  x={box.x - ACTIVE_BOX_STROKE_WIDTH}
                  y={box.y - ACTIVE_BOX_STROKE_WIDTH}
                  width={box.width + ACTIVE_BOX_STROKE_WIDTH * 2}
                  height={box.height + ACTIVE_BOX_STROKE_WIDTH * 2}
                >
                  <rect
                    x={box.x - ACTIVE_BOX_STROKE_WIDTH}
                    y={box.y - ACTIVE_BOX_STROKE_WIDTH}
                    width={box.width + ACTIVE_BOX_STROKE_WIDTH * 2}
                    height={box.height + ACTIVE_BOX_STROKE_WIDTH * 2}
                    fill={`url(#${_gradientId})`}
                  />
                </mask>
              </g>
            );
          }),
        )}
      </defs>

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
              <g key={box.key}>
                <rect
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
                  mask={`url(#${buildBoxStrokeMaskId(box.key)})`}
                  className="drop-shadow"
                />
                <rect
                  data-move-overlay-box-hit="true"
                  data-move-overlay-hit="true"
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  rx={box.rx}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={BOX_BORDER_HIT_WIDTH}
                  pointerEvents="stroke"
                  className="cursor-pointer"
                  onMouseEnter={(event) => onMoveHover?.(group.moveId, event)}
                  onMouseMove={(event) => onMoveHover?.(group.moveId, event)}
                  onMouseLeave={() => onMoveLeave?.(group.moveId)}
                  onClick={(event) => onMoveClick?.(group.moveId, event)}
                />
              </g>
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

function buildBoxStrokeMaskGradientId(boxKey: string) {
  return `move-box-stroke-mask-gradient-${boxKey}`;
}

function buildBoxStrokeMaskId(boxKey: string) {
  return `move-box-stroke-mask-${boxKey}`;
}
