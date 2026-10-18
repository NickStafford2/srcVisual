import { useEffect, useMemo, useState } from "react";
import { fetchArtifactXml } from "../../api";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type {
  ArtifactDiffKind,
  ArtifactMoveSummary,
  ArtifactTreeNode,
  ArtifactXmlProjection,
} from "../../types";
import { XmlPane } from "../source-view/XmlPane";
import { expandReportEndpoints } from "./reportedMoves";

export function ArtifactXmlPane({
  artifactId,
  active,
  selectedNode,
  visibleDiffKinds = ALL_DIFF_KINDS,
  moves,
  visibleMoveIds,
  onSelectNodeId,
}: {
  artifactId: string;
  active: boolean;
  selectedNode: ArtifactTreeNode | null;
  visibleDiffKinds?: ReadonlySet<ArtifactDiffKind>;
  moves?: ArtifactMoveSummary[];
  visibleMoveIds?: ReadonlySet<string>;
  onSelectNodeId: (nodeId: string) => void;
}) {
  const [projection, setProjection] = useState<ArtifactXmlProjection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || projection?.artifact_id === artifactId) return;
    let current = true;
    setError(null);
    void fetchArtifactXml(artifactId)
      .then((result) => {
        if (current) setProjection(result);
      })
      .catch((reason: unknown) => {
        if (current) {
          setError(
            reason instanceof Error ? reason.message : "Unable to load XML.",
          );
        }
      });
    return () => {
      current = false;
    };
  }, [active, artifactId, projection?.artifact_id]);

  const highlights = useMemo(() => {
    if (!projection) return [];
    const visibleAtomicIds =
      moves && visibleMoveIds
        ? new Set(
            moves
              .filter((move) => visibleMoveIds.has(move.move_id))
              .flatMap(expandReportEndpoints)
              .map((move) => move.move_id),
          )
        : undefined;
    const anchors: SourceViewHighlight[] = projection.anchors
      .filter(
        (anchor) =>
          (anchor.kind === "move" &&
            (!visibleAtomicIds ||
              (anchor.move_id && visibleAtomicIds.has(anchor.move_id)))) ||
          (anchor.diff_kind !== null &&
            anchor.diff_kind !== undefined &&
            visibleDiffKinds.has(anchor.diff_kind)) ||
          (anchor.kind !== "move" &&
            anchor.diff_kind === undefined &&
            visibleDiffKinds.has(anchor.kind)),
      )
      .map((anchor) => ({
        nodeId: anchor.node_id,
        moveId:
          anchor.kind === "move" &&
          visibleAtomicIds &&
          !visibleAtomicIds.has(anchor.move_id ?? "")
            ? null
            : anchor.move_id,
        moveOrigin: anchor.move_origin,
        kind:
          anchor.kind === "move" &&
          visibleAtomicIds &&
          !visibleAtomicIds.has(anchor.move_id ?? "")
            ? (anchor.diff_kind ?? "plain")
            : anchor.kind,
        span: anchor.span,
      }));
    if (
      selectedNode?.xml_span &&
      ((selectedNode.kind === "move" &&
        (!visibleAtomicIds ||
          visibleAtomicIds.has(selectedNode.move_id ?? ""))) ||
        (selectedNode.kind !== "plain" &&
          selectedNode.kind !== "move" &&
          visibleDiffKinds.has(selectedNode.kind))) &&
      !projection.anchors.some(
        (anchor) => anchor.node_id === selectedNode.node_id,
      )
    ) {
      anchors.push({
        nodeId: selectedNode.node_id,
        moveId: selectedNode.move_id,
        moveOrigin: selectedNode.move_origin,
        kind: selectedNode.kind,
        span: selectedNode.xml_span,
      });
    }
    return anchors;
  }, [projection, selectedNode, visibleDiffKinds, moves, visibleMoveIds]);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!projection || projection.artifact_id !== artifactId) {
    return <p className="text-sm text-slate-400">Loading XML…</p>;
  }
  return (
    <XmlPane
      source={projection.xml}
      highlights={highlights}
      selectedNodeId={selectedNode?.node_id ?? null}
      onSelectNodeId={onSelectNodeId}
    />
  );
}

const ALL_DIFF_KINDS = new Set<ArtifactDiffKind>([
  "common",
  "delete",
  "insert",
]);
