from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from srcdiffvisual.workflow.models import VisualizationPayload

ArtifactOrigin = Literal["upload", "history", "benchmark"]


@dataclass(frozen=True)
class ArtifactProvenance:
    origin: ArtifactOrigin
    history_pair: int | None = None
    move_results_source: Literal["generated", "provided", "reconstructed"] = "generated"
    benchmark_case: dict[str, object] | None = None
    producer_tool_sha256: dict[str, str] | None = None

    def to_dict(self) -> dict[str, object]:
        _value: dict[str, object] = {
            "origin": self.origin,
            "history_pair": self.history_pair,
            "move_results_source": self.move_results_source,
        }
        if self.benchmark_case is not None:
            _value["benchmark_case"] = self.benchmark_case
        return _value


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
