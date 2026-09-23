from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from srcvisual.workflow.models import VisualizationPayload

ArtifactOrigin = Literal["upload", "history"]


@dataclass(frozen=True)
class ArtifactProvenance:
    origin: ArtifactOrigin
    history_pair: int | None = None
    move_results_source: Literal["generated", "provided", "reconstructed"] = "generated"

    def to_dict(self) -> dict[str, object]:
        return {
            "origin": self.origin,
            "history_pair": self.history_pair,
            "move_results_source": self.move_results_source,
        }


@dataclass(frozen=True)
class PublishedArtifact:
    artifact_id: str
    path: Path
    manifest: dict[str, Any]


@dataclass(frozen=True)
class StoredArtifact:
    artifact_id: str
    manifest: dict[str, Any]
    payload: VisualizationPayload
