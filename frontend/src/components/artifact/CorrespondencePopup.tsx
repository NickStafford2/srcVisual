import { useEffect, useState } from "react";
import { ArtifactPopup } from "./ArtifactPopup";
import {
  CorrespondenceRecord,
  correspondenceColor,
  getProjection,
  type Detail,
  type Pair,
} from "./ArtifactCorrespondences";

export function CorrespondencePopup({
  artifactId,
  pair,
  position,
  onClose,
}: {
  artifactId: string;
  pair: Pair;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setDetail(null);
    setError(null);
    void getProjection<Detail>(
      `/api/artifacts/${artifactId}/correspondences/${pair.id}`,
    )
      .then((value) => {
        if (current) setDetail(value);
      })
      .catch((reason) => {
        if (current) setError(String(reason.message ?? reason));
      });
    return () => {
      current = false;
    };
  }, [artifactId, pair.id]);
  return (
    <ArtifactPopup
      title="Correspondence details"
      badge={pair.kind.toUpperCase()}
      identity={`Pair ${pair.id + 1}`}
      position={position}
      color={correspondenceColor(pair.kind)}
      onClose={onClose}
    >
      <div className="p-4 text-xs">
        {error ? (
          <p role="alert">{error}</p>
        ) : detail ? (
          <CorrespondenceRecord detail={detail} />
        ) : (
          <p>Loading correspondence…</p>
        )}
      </div>
    </ArtifactPopup>
  );
}
