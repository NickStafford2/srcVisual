import type { DiffRegionGroup } from "./_diffRegionGeometry";

export function DiffRegionOverlay({ groups }: { groups: DiffRegionGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <svg
      aria-label="Selected srcDiff region boundaries"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
    >
      {groups.map((group) => (
        <g
          key={group.key}
          data-diff-region-overlay={group.nodeId}
          data-diff-region-relation={group.relation}
          className={regionColor(group.kind)}
        >
          {group.paths.map((path) => (
            <path
              key={path.key}
              d={path.d}
              fill="currentColor"
              fillOpacity={group.relation === "selected" ? 0.08 : 0.025}
              stroke="currentColor"
              strokeOpacity={group.relation === "selected" ? 0.98 : 0.55}
              strokeWidth={group.relation === "selected" ? 2.5 : 1.25}
              strokeDasharray={
                group.relation === "ancestor"
                  ? "7 4"
                  : group.relation === "child"
                    ? "2 3"
                    : undefined
              }
              vectorEffect="non-scaling-stroke"
              className="drop-shadow"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function regionColor(kind: DiffRegionGroup["kind"]) {
  if (kind === "delete") return "text-diff-delete";
  if (kind === "insert") return "text-diff-insert";
  return "text-slate-300";
}
