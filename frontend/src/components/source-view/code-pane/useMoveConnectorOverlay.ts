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

type RectLike = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

function createMoveSegmentElements(): MoveSegmentElements {
  return {
    "revision-0": new Set<HTMLElement>(),
    "revision-1": new Set<HTMLElement>(),
  };
}

function getCombinedRect(elements: HTMLElement[]): RectLike | null {
  if (elements.length === 0) {
    return null;
  }

  const rects = elements.map((element) => element.getBoundingClientRect());

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
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
      const fromRect = getCombinedRect(Array.from(elements["revision-0"]));
      const toRect = getCombinedRect(Array.from(elements["revision-1"]));

      if (!fromRect || !toRect) {
        continue;
      }

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
        key: moveId,
        d: [
          `M ${start.x} ${start.y}`,
          `C ${start.x + controlOffset} ${start.y}`,
          `${end.x - controlOffset} ${end.y}`,
          `${end.x} ${end.y}`,
        ].join(" "),
      });
    }

    setPaths(nextPaths);
  }, []);

  const registerMoveSegment = useCallback(
    ({ moveId, revision, element }: MoveSegmentRegistration) => {
      const current =
        segmentElementsByMoveIdRef.current.get(moveId) ??
        createMoveSegmentElements();

      current[revision].add(element);
      segmentElementsByMoveIdRef.current.set(moveId, current);

      requestAnimationFrame(updatePaths);
    },
    [updatePaths],
  );

  const unregisterMoveSegment = useCallback(
    ({ moveId, revision, element }: MoveSegmentUnregistration) => {
      const current = segmentElementsByMoveIdRef.current.get(moveId);

      if (!current) {
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
