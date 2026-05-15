import type { MoveConnectorGroup } from "./_moveConnectorGeometry";

type MoveConnectorOverlayProps = {
  groups: MoveConnectorGroup[];
  activeMoveId?: string | null;
  onHubHover?: (
    moveId: string,
    event: React.MouseEvent<SVGCircleElement>,
  ) => void;
  onHubLeave?: (moveId: string) => void;
  onHubClick?: (
    moveId: string,
    event: React.MouseEvent<SVGCircleElement>,
  ) => void;
};

export function MoveConnectorOverlay({
  groups,
  activeMoveId = null,
  onHubHover,
  onHubLeave,
  onHubClick,
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
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={activeMoveId === group.moveId ? 3.5 : 2}
              className="drop-shadow"
            />
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
                className="pointer-events-auto cursor-pointer"
                onMouseEnter={(event) => onHubHover?.(group.moveId, event)}
                onMouseMove={(event) => onHubHover?.(group.moveId, event)}
                onMouseLeave={() => onHubLeave?.(group.moveId)}
                onClick={(event) => onHubClick?.(group.moveId, event)}
              />
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
