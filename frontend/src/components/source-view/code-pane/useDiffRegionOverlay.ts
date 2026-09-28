import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ArtifactDiffOverlayRegion } from "../../../types";
import {
  buildDiffRegionGroup,
  type DiffRegionGroup,
} from "./_diffRegionGeometry";
import type { RectLike } from "./_moveConnectorGeometry";

export function useDiffRegionOverlay(regions: ArtifactDiffOverlayRegion[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [groups, setGroups] = useState<DiffRegionGroup[]>([]);

  const updatePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container || regions.length === 0) {
      setGroups([]);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const regionById = new Map(
      regions.map((region) => [region.nodeId, region]),
    );
    const rects = new Map<string, Map<string, RectLike[]>>();
    for (const element of container.querySelectorAll<HTMLElement>(
      "[data-diff-region-ids]",
    )) {
      const revision = element.dataset.sourceRevision;
      if (!revision) continue;
      for (const nodeId of element.dataset.diffRegionIds?.split("|") ?? []) {
        if (!regionById.has(nodeId)) continue;
        const byRevision = rects.get(nodeId) ?? new Map<string, RectLike[]>();
        const revisionRects = byRevision.get(revision) ?? [];
        revisionRects.push(element.getBoundingClientRect());
        byRevision.set(revision, revisionRects);
        rects.set(nodeId, byRevision);
      }
    }
    setGroups(
      regions.flatMap((region) => {
        const group = buildDiffRegionGroup({
          region,
          containerRect,
          rectsByRevision: rects.get(region.nodeId) ?? new Map(),
        });
        return group ? [group] : [];
      }),
    );
  }, [regions]);

  useLayoutEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePaths);
    };
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const resizeObserver = new ResizeObserver(schedule);
    const mutationObserver = new MutationObserver(schedule);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updatePaths]);

  return { containerRef, groups, updatePaths };
}
