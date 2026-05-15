import type { MoveConnectorGroup } from "./_moveConnectorGeometry";

type MoveConnectorOverlayProps = {
  groups: MoveConnectorGroup[];
};

export function MoveConnectorOverlay({ groups }: MoveConnectorOverlayProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible">
      {groups.map((group) => (
        <g key={group.key} className="text-diff-move-1/70">
          {group.paths.map((path) => (
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="drop-shadow"
            />
          ))}

          {group.hub ? (
            <circle
              cx={group.hub.cx}
              cy={group.hub.cy}
              r={group.hub.r}
              fill="currentColor"
              className="drop-shadow"
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}
