import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type {
  MoveSegmentRegistration,
  MoveSegmentUnregistration,
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";
import type { MoveConnectorPath } from "./MoveConnectorOverlay";

type MoveSegmentElements = {
  "revision-0": Set<HTMLElement>;
  "revision-1": Set<HTMLElement>;
};

function createMoveSegmentElements(): MoveSegmentElements {
  return {
    "revision-0": new Set<HTMLElement>(),
    "revision-1": new Set<HTMLElement>(),
  };
}

export function useMoveConnectorOverlay() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const segmentElementsByMoveIdRef = useRef<Map<string, MoveSegmentElements>>(
    new Map(),
  );
  const [paths, setPaths] = useState<MoveConnectorPath[]>([]);

  const updatePaths = useCallback(() => {
    const container = containerRef.current;

    console.log("updatePaths called", {
      hasContainer: Boolean(container),
      registeredMoveIds: Array.from(segmentElementsByMoveIdRef.current.keys()),
    });

    if (!container) {
      setPaths([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextPaths: MoveConnectorPath[] = [];

    for (const [moveId, elements] of segmentElementsByMoveIdRef.current) {
      const fromElements = Array.from(elements["revision-0"]);
      const toElements = Array.from(elements["revision-1"]);

      console.log("move connector candidate", {
        moveId,
        revision0Count: fromElements.length,
        revision1Count: toElements.length,
      });

      if (fromElements.length === 0 || toElements.length === 0) {
        continue;
      }

      for (const [fromIndex, from] of fromElements.entries()) {
        for (const [toIndex, to] of toElements.entries()) {
          const fromRect = from.getBoundingClientRect();
          const toRect = to.getBoundingClientRect();

          const start = {
            x: fromRect.right - containerRect.left,
            y: fromRect.top + fromRect.height / 2 - containerRect.top,
          };

          const end = {
            x: toRect.left - containerRect.left,
            y: toRect.top + toRect.height / 2 - containerRect.top,
          };

          const controlOffset = Math.max(48, Math.abs(end.x - start.x) * 0.35);

          const d = [
            `M ${start.x} ${start.y}`,
            `C ${start.x + controlOffset} ${start.y}`,
            `${end.x - controlOffset} ${end.y}`,
            `${end.x} ${end.y}`,
          ].join(" ");

          console.log("created move connector path", {
            moveId,
            fromIndex,
            toIndex,
            fromRect,
            toRect,
            containerRect,
            start,
            end,
            d,
          });

          nextPaths.push({
            key: `${moveId}-${fromIndex}-${toIndex}`,
            d,
          });
        }
      }
    }

    console.log("next move connector paths", nextPaths);

    setPaths(nextPaths);
  }, []);

  const registerMoveSegment = useCallback(
    ({ moveId, revision, element }: MoveSegmentRegistration) => {
      const current =
        segmentElementsByMoveIdRef.current.get(moveId) ??
        createMoveSegmentElements();

      current[revision].add(element);
      segmentElementsByMoveIdRef.current.set(moveId, current);

      console.log("registered move segment", {
        moveId,
        revision,
        revision0Count: current["revision-0"].size,
        revision1Count: current["revision-1"].size,
        element,
      });

      requestAnimationFrame(updatePaths);
    },
    [updatePaths],
  );

  const unregisterMoveSegment = useCallback(
    ({ moveId, revision, element }: MoveSegmentUnregistration) => {
      const current = segmentElementsByMoveIdRef.current.get(moveId);

      if (!current) {
        console.log("unregister skipped; move id missing", {
          moveId,
          revision,
          element,
        });
        return;
      }

      current[revision].delete(element);

      if (
        current["revision-0"].size === 0 &&
        current["revision-1"].size === 0
      ) {
        segmentElementsByMoveIdRef.current.delete(moveId);
      } else {
        segmentElementsByMoveIdRef.current.set(moveId, current);
      }

      console.log("unregistered move segment", {
        moveId,
        revision,
        revision0Count: current["revision-0"].size,
        revision1Count: current["revision-1"].size,
        element,
      });

      requestAnimationFrame(updatePaths);
    },
    [updatePaths],
  );

  useLayoutEffect(() => {
    updatePaths();

    window.addEventListener("resize", updatePaths);
    window.addEventListener("scroll", updatePaths, true);

    const resizeObserver = new ResizeObserver(updatePaths);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePaths);
      window.removeEventListener("scroll", updatePaths, true);
      resizeObserver.disconnect();
    };
  }, [updatePaths]);

  return {
    containerRef,
    paths,
    registerMoveSegment: registerMoveSegment as RegisterMoveSegment,
    unregisterMoveSegment: unregisterMoveSegment as UnregisterMoveSegment,
    updatePaths,
  };
}
