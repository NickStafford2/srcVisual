import type { MoveConnectorGroup } from "./_moveConnectorGeometry";

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
      {groups.map((group) => (
        <g key={group.key} className="text-diff-move-1/70">
          {group.boxes.map((box) => (
            <rect
              key={box.key}
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={box.rx}
              fill="currentColor"
              fillOpacity={0.14}
              stroke="currentColor"
              strokeOpacity={0.45}
              strokeWidth={1.5}
            />
          ))}

          {group.paths.map((path) => (
            <g key={path.key}>
              <path
                d={path.d}
                fill="none"
                stroke="currentColor"
                strokeWidth={activeMoveId === group.moveId ? 3.5 : 2}
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
                cx={group.hub.cx}
                cy={group.hub.cy}
                r={group.hub.r}
                fill="currentColor"
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
      ))}
    </svg>
  );
}
