from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

RUN_CONTRACT_SCHEMA_VERSION = 1

RunKind = Literal["history-visualization"]
RunStatus = Literal["queued", "running", "completed", "failed", "cancelled"]
RunEventType = Literal["status", "progress", "cancellation-requested"]


@dataclass(frozen=True)
class RunDiagnostic:
    code: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}


@dataclass(frozen=True)
class RunRecord:
    run_id: str
    kind: RunKind
    history_pair: int
    status: RunStatus
    artifact_id: str | None
    cancellation_requested: bool
    diagnostic: RunDiagnostic | None
    created_at: str
    started_at: str | None
    finished_at: str | None
    latest_event_sequence: int

    def to_dict(self) -> dict[str, object]:
        return {
            "run_id": self.run_id,
            "kind": self.kind,
            "history_pair": self.history_pair,
            "status": self.status,
            "artifact_id": self.artifact_id,
            "cancellation_requested": self.cancellation_requested,
            "diagnostic": (
                None if self.diagnostic is None else self.diagnostic.to_dict()
            ),
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "latest_event_sequence": self.latest_event_sequence,
        }


@dataclass(frozen=True)
class RunEvent:
    run_id: str
    sequence: int
    type: RunEventType
    status: RunStatus
    message: str
    created_at: str

    def to_dict(self) -> dict[str, object]:
        return {
            "run_id": self.run_id,
            "sequence": self.sequence,
            "type": self.type,
            "status": self.status,
            "message": self.message,
            "created_at": self.created_at,
        }
