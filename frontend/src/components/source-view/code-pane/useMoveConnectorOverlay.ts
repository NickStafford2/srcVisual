import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type {
  MoveSegmentRegistration,
  MoveSegmentUnregistration,
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";
import {
  buildMoveConnectorGroup,
  type MoveConnectorGroup,
  type RectLike,
} from "./_moveConnectorGeometry";

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

function getElementRects(elements: HTMLElement[]): RectLike[] {
  return elements.map((element) => element.getBoundingClientRect());
}

export function useMoveConnectorOverlay() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const segmentElementsByMoveIdRef = useRef<Map<string, MoveSegmentElements>>(
    new Map(),
  );
  const [groups, setGroups] = useState<MoveConnectorGroup[]>([]);

  const updatePaths = useCallback(() => {
    const container = containerRef.current;

    if (!container) {
      setGroups([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextGroups: MoveConnectorGroup[] = [];

    for (const [moveId, elements] of segmentElementsByMoveIdRef.current) {
      const group = buildMoveConnectorGroup({
        moveId,
        containerRect,
        fromRects: getElementRects(Array.from(elements["revision-0"])),
        toRects: getElementRects(Array.from(elements["revision-1"])),
      });

      if (group) {
        nextGroups.push(group);
      }
    }

    setGroups(nextGroups);
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
    groups,
    registerMoveSegment: registerMoveSegment as RegisterMoveSegment,
    unregisterMoveSegment: unregisterMoveSegment as UnregisterMoveSegment,
    updatePaths,
  };
}
