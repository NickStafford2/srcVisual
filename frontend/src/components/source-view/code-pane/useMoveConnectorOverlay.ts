import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type {
  MoveSegmentRegistration,
  RegisterMoveSegment,
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

    if (!container) {
      setPaths([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextPaths: MoveConnectorPath[] = [];

    for (const [moveId, elements] of segmentElementsByMoveIdRef.current) {
      const fromElements = Array.from(elements["revision-0"]);
      const toElements = Array.from(elements["revision-1"]);

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

          nextPaths.push({
            key: `${moveId}-${fromIndex}-${toIndex}`,
            d: [
              `M ${start.x} ${start.y}`,
              `C ${start.x + controlOffset} ${start.y}`,
              `${end.x - controlOffset} ${end.y}`,
              `${end.x} ${end.y}`,
            ].join(" "),
          });
        }
      }
    }

    setPaths(nextPaths);
  }, []);

  const registerMoveSegment = useCallback(
    ({ moveId, revision, element }: MoveSegmentRegistration) => {
      const current =
        segmentElementsByMoveIdRef.current.get(moveId) ??
        createMoveSegmentElements();

      if (element) {
        current[revision].add(element);
        segmentElementsByMoveIdRef.current.set(moveId, current);
      } else {
        // React cleanup cannot reliably identify which old element was removed
        // because this API only receives null. Clear this revision and let the
        // next mounted highlighted spans re-register themselves.
        current[revision].clear();

        if (
          current["revision-0"].size === 0 &&
          current["revision-1"].size === 0
        ) {
          segmentElementsByMoveIdRef.current.delete(moveId);
        } else {
          segmentElementsByMoveIdRef.current.set(moveId, current);
        }
      }

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
    updatePaths,
  };
}
