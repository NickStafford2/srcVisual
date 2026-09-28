import type {
  ArtifactDiffOverlayRegion,
  ArtifactDiffRegionRelation,
} from "../../../types";
import type { RectLike } from "./_moveConnectorGeometry";

export type DiffRegionPath = {
  key: string;
  d: string;
};

export type DiffRegionGroup = ArtifactDiffOverlayRegion & {
  key: string;
  paths: DiffRegionPath[];
};

export function buildDiffRegionGroup({
  region,
  containerRect,
  rectsByRevision,
}: {
  region: ArtifactDiffOverlayRegion;
  containerRect: RectLike;
  rectsByRevision: Map<string, RectLike[]>;
}): DiffRegionGroup | null {
  const paths = [...rectsByRevision.entries()].flatMap(([revision, rects]) =>
    buildRegionPaths(
      rects,
      containerRect,
      region.relation,
      region.distance,
    ).map((d, index) => ({ key: `${region.nodeId}-${revision}-${index}`, d })),
  );
  if (paths.length === 0) return null;
  return { ...region, key: region.nodeId, paths };
}

export function buildRegionPaths(
  rects: RectLike[],
  containerRect: RectLike,
  relation: ArtifactDiffRegionRelation,
  distance: number,
): string[] {
  const padding = regionPadding(relation, distance);
  const lines = mergeLineRects(rects).map((rect) => ({
    left: rect.left - containerRect.left - padding,
    right: rect.right - containerRect.left + padding,
    top: rect.top - containerRect.top - 2,
    bottom: rect.bottom - containerRect.top + 2,
  }));
  return clusterLines(lines).map(buildSteppedPath);
}

function mergeLineRects(rects: RectLike[]) {
  const sorted = [...rects].sort(
    (left, right) => left.top - right.top || left.left - right.left,
  );
  const lines: RectLike[] = [];
  for (const rect of sorted) {
    const current = lines[lines.length - 1];
    if (current && rect.top <= current.bottom && rect.bottom >= current.top) {
      current.left = Math.min(current.left, rect.left);
      current.right = Math.max(current.right, rect.right);
      current.top = Math.min(current.top, rect.top);
      current.bottom = Math.max(current.bottom, rect.bottom);
      current.width = current.right - current.left;
      current.height = current.bottom - current.top;
    } else {
      lines.push({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      });
    }
  }
  return lines;
}

type LineRect = { left: number; right: number; top: number; bottom: number };

function clusterLines(lines: LineRect[]) {
  const clusters: LineRect[][] = [];
  for (const line of lines) {
    const cluster = clusters[clusters.length - 1];
    const previous = cluster?.[cluster.length - 1];
    if (previous && line.top - previous.bottom <= 20) cluster.push(line);
    else clusters.push([line]);
  }
  return clusters;
}

function buildSteppedPath(lines: LineRect[]) {
  const first = lines[0];
  const last = lines[lines.length - 1];
  const commands = [`M ${first.left} ${first.top}`, `H ${first.right}`];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    commands.push(`V ${line.bottom}`);
    const next = lines[index + 1];
    if (next) commands.push(`H ${next.right}`, `V ${next.top}`);
  }
  commands.push(`H ${last.left}`);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    commands.push(`V ${line.top}`);
    const previous = lines[index - 1];
    if (previous) commands.push(`H ${previous.left}`, `V ${previous.bottom}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

function regionPadding(relation: ArtifactDiffRegionRelation, distance: number) {
  if (relation === "selected") return 5;
  if (relation === "ancestor") return 7 + distance * 3;
  return 2;
}
