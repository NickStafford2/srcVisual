import { useEffect, useState } from "react";
import { fetchArtifactXml } from "../../api";
import { XmlPane } from "../source-view/XmlPane";

export function ArtifactXmlPane({
  artifactId,
  active,
}: {
  artifactId: string;
  active: boolean;
}) {
  const [xml, setXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || xml !== null) return;
    let current = true;
    void fetchArtifactXml(artifactId)
      .then((source) => {
        if (current) setXml(source);
      })
      .catch((reason: unknown) => {
        if (current) {
          setError(reason instanceof Error ? reason.message : "Unable to load XML.");
        }
      });
    return () => {
      current = false;
    };
  }, [active, artifactId, xml]);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (xml === null) return <p className="text-sm text-slate-400">Loading XML…</p>;
  return <XmlPane source={xml} highlights={[]} />;
}
