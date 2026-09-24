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
  "revision-0": Map<string, Set<HTMLElement>>;
  "revision-1": Map<string, Set<HTMLElement>>;
};

function createMoveSegmentElements(): MoveSegmentElements {
  return {
    "revision-0": new Map<string, Set<HTMLElement>>(),
    "revision-1": new Map<string, Set<HTMLElement>>(),
  };
}

function getEndpointRectGroups(
  endpoints: Map<string, Set<HTMLElement>>,
): RectLike[][] {
  return Array.from(endpoints.values(), (elements) =>
    Array.from(elements, (element) => element.getBoundingClientRect()),
  );
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
        fromEndpointRectGroups: getEndpointRectGroups(elements["revision-0"]),
        toEndpointRectGroups: getEndpointRectGroups(elements["revision-1"]),
      });

      if (group) {
        nextGroups.push(group);
      }
    }

    setGroups(nextGroups);
  }, []);

  const registerMoveSegment = useCallback(
    ({ moveId, endpointId, revision, element }: MoveSegmentRegistration) => {
      const current =
        segmentElementsByMoveIdRef.current.get(moveId) ??
        createMoveSegmentElements();

      const endpointElements = current[revision].get(endpointId) ?? new Set();
      endpointElements.add(element);
      current[revision].set(endpointId, endpointElements);
      segmentElementsByMoveIdRef.current.set(moveId, current);

      requestAnimationFrame(updatePaths);
    },
    [updatePaths],
  );

  const unregisterMoveSegment = useCallback(
    ({ moveId, endpointId, revision, element }: MoveSegmentUnregistration) => {
      const current = segmentElementsByMoveIdRef.current.get(moveId);

      if (!current) {
        return;
      }

      const endpointElements = current[revision].get(endpointId);
      endpointElements?.delete(element);
      if (endpointElements?.size === 0) current[revision].delete(endpointId);

      if (
        current["revision-0"].size === 0 && current["revision-1"].size === 0
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
