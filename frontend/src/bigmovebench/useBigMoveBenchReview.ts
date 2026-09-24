import { useState } from "react";
import type { ArtifactManifest } from "../types";
import { importBigMoveBenchReview, visualizeBigMoveBenchCase } from "./api";
import type { BigMoveBenchReviewManifest } from "./types";

export function useBigMoveBenchReview(
  acceptVisualization: (payload: ArtifactManifest) => void,
) {
  const [selectedBundle, setSelectedBundle] = useState<File | null>(null);
  const [manifest, setManifest] = useState<BigMoveBenchReviewManifest | null>(
    null,
  );
  const [activeOrdinal, setActiveOrdinal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importBundle() {
    if (!selectedBundle) {
      setError("Choose a Type-3 review ZIP first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await importBigMoveBenchReview(selectedBundle);
      setManifest(loaded);
      setActiveOrdinal(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function visualizeCase(ordinal: number) {
    if (!manifest) return;
    setIsLoading(true);
    setError(null);
    try {
      const artifact = await visualizeBigMoveBenchCase(
        manifest.review_id,
        ordinal,
      );
      setActiveOrdinal(ordinal);
      acceptVisualization(artifact);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to open review case.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    selectedBundle,
    manifest,
    activeOrdinal,
    isLoading,
    error,
    setSelectedBundle,
    importBundle,
    visualizeCase,
    acceptVisualization,
  };
}
