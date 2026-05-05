export type MoveConnectorPath = {
  key: string;
  d: string;
};

type MoveConnectorOverlayProps = {
  paths: MoveConnectorPath[];
};

export function MoveConnectorOverlay({ paths }: MoveConnectorOverlayProps) {
  if (paths.length === 0) {
    return null;
  }

  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
      {paths.map((path) => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-diff-move-1/70 drop-shadow"
        />
      ))}
    </svg>
  );
}
