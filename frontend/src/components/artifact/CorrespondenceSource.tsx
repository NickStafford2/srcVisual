import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "../source-view/code-pane/moveConnectors";
import type { MoveConnectorGroup } from "../source-view/code-pane/_moveConnectorGeometry";
import {
  correspondenceColor,
  type Pair,
  type SourceLocation,
} from "./ArtifactCorrespondences";

export type CorrespondenceEndpoint = {
  pair: Pair;
  revision: "revision-0" | "revision-1";
  location: SourceLocation;
};
export const CorrespondenceSourceContext = createContext<{
  pairs: Pair[];
  register: RegisterMoveSegment;
  unregister: UnregisterMoveSegment;
  inspect: (pair: Pair, position: { x: number; y: number }) => void;
} | null>(null);

export function CorrespondenceSpan({
  endpoints,
  children,
  proxy = false,
}: {
  endpoints: CorrespondenceEndpoint[];
  children: ReactNode;
  proxy?: boolean;
}) {
  const context = useContext(CorrespondenceSourceContext);
  const ref = useRef<HTMLSpanElement>(null);
  const endpointKey = endpoints
    .map((e) => `${e.pair.id}:${e.revision}`)
    .join(",");
  // Endpoint list can change with source focus; register only currently rendered elements.
  useEffect(() => {
    const element = ref.current;
    if (!element || !context) return;
    const registrations = endpointKey
      ? endpointKey.split(",").map((key) => {
          const [id, side] = key.split(":");
          const revision = side as "revision-0" | "revision-1";
          return {
            moveId: `correspondence-${id}`,
            endpointId: key,
            revision,
            element,
          };
        })
      : [];
    registrations.forEach(context.register);
    return () => registrations.forEach(context.unregister);
  }, [context, endpointKey]);
  return (
    <span
      ref={ref}
      data-correspondence-segment={endpoints.map((e) => e.pair.id).join(",")}
      style={
        endpoints.length
          ? {
              backgroundColor: `${correspondenceColor(endpoints[0].pair.kind)}18`,
            }
          : undefined
      }
    >
      {proxy && endpoints[0] ? (
        <button
          style={{ color: correspondenceColor(endpoints[0].pair.kind) }}
          onClick={(event) =>
            context?.inspect(endpoints[0].pair, {
              x: event.clientX,
              y: event.clientY,
            })
          }
        >
          {children}
        </button>
      ) : (
        children
      )}
    </span>
  );
}

export function CorrespondenceOverlay({
  groups,
  pairs,
  inspect,
}: {
  groups: MoveConnectorGroup[];
  pairs: Pair[];
  inspect: (pair: Pair, position: { x: number; y: number }) => void;
}) {
  return (
    <svg
      aria-label="Correspondence connectors"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
    >
      {groups.map((group) => {
        const pair = pairs.find(
          (p) => `correspondence-${p.id}` === group.moveId,
        );
        if (!pair) return null;
        const from = group.boxes.find((b) => b.revision === "revision-0");
        const to = group.boxes.find((b) => b.revision === "revision-1");
        const click = (event: React.MouseEvent<SVGElement>) =>
          inspect(pair, { x: event.clientX, y: event.clientY });
        // Inset the corner route slightly to keep it distinct from the move center route.
        const path =
          from && to
            ? `M ${from.x} ${from.y + 3} C ${from.x} ${from.y - 9}, ${to.x} ${to.y - 9}, ${to.x} ${to.y + 3}`
            : null;
        return (
          <g
            key={group.key}
            data-correspondence-id={pair.id}
            style={{ color: correspondenceColor(pair.kind) }}
          >
            {group.boxes.map((box) => (
              <g key={box.key}>
                <rect
                  role="button"
                  aria-label={`Inspect correspondence ${pair.id + 1} ${box.revision === "revision-0" ? "before" : "after"}`}
                  tabIndex={0}
                  x={box.x - 10}
                  y={box.y - 10}
                  width={8}
                  height={8}
                  rx={2}
                  fill="currentColor"
                  pointerEvents="all"
                  className="cursor-pointer"
                  onClick={click}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      const rect = event.currentTarget.getBoundingClientRect();
                      inspect(pair, { x: rect.left, y: rect.bottom });
                    }
                  }}
                />
                <rect
                  x={box.x - 2}
                  y={box.y - 2}
                  width={box.width + 4}
                  height={box.height + 4}
                  rx={4}
                  fill="currentColor"
                  fillOpacity={0.05}
                  stroke="currentColor"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                />
                <rect
                  data-correspondence-overlay-hit="true"
                  x={box.x - 2}
                  y={box.y - 2}
                  width={box.width + 4}
                  height={box.height + 4}
                  rx={4}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={5}
                  pointerEvents="stroke"
                  className="cursor-pointer"
                  onClick={click}
                />
              </g>
            ))}
            {path ? (
              <>
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4 3"
                  strokeWidth={1.25}
                />
                <path
                  data-correspondence-overlay-hit="true"
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={6}
                  pointerEvents="stroke"
                  className="cursor-pointer"
                  onClick={click}
                />
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
