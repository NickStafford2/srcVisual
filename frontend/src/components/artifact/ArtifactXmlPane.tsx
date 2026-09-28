import { useEffect, useMemo, useState } from "react";
import { fetchArtifactXml } from "../../api";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import type {
  ArtifactDiffKind,
  ArtifactTreeNode,
  ArtifactXmlProjection,
} from "../../types";
import { XmlPane } from "../source-view/XmlPane";

export function ArtifactXmlPane({
  artifactId,
  active,
  selectedNode,
  visibleDiffKinds = ALL_DIFF_KINDS,
  onSelectNodeId,
}: {
  artifactId: string;
  active: boolean;
  selectedNode: ArtifactTreeNode | null;
  visibleDiffKinds?: ReadonlySet<ArtifactDiffKind>;
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
    const anchors: SourceViewHighlight[] = projection.anchors
      .filter(
        (anchor) => anchor.kind === "move" || visibleDiffKinds.has(anchor.kind),
      )
      .map((anchor) => ({
        nodeId: anchor.node_id,
        moveId: anchor.move_id,
        kind: anchor.kind,
        span: anchor.span,
      }));
    if (
      selectedNode?.xml_span &&
      (selectedNode.kind === "move" ||
        (selectedNode.kind !== "plain" &&
          visibleDiffKinds.has(selectedNode.kind))) &&
      !projection.anchors.some(
        (anchor) => anchor.node_id === selectedNode.node_id,
      )
    ) {
      anchors.push({
        nodeId: selectedNode.node_id,
        moveId: selectedNode.move_id,
        kind: selectedNode.kind,
        span: selectedNode.xml_span,
      });
    }
    return anchors;
  }, [projection, selectedNode, visibleDiffKinds]);

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
