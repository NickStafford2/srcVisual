from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RevisionFile:
    unit_id: int
    filename: str
    language: str | None
    revision_0_source_code: str
    revision_1_source_code: str

    def to_dict(self) -> dict[str, object]:
        return {
            "unit_id": self.unit_id,
            "filename": self.filename,
            "language": self.language,
            "revision_0_source_code": self.revision_0_source_code,
            "revision_1_source_code": self.revision_1_source_code,
        }


@dataclass(frozen=True)
class VisualizedFile:
    revision_file: RevisionFile
    tree: dict[str, object] | None

    def to_dict(self) -> dict[str, object]:
        return {
            **self.revision_file.to_dict(),
            "tree": self.tree,
        }


@dataclass(frozen=True)
class VisualizationPayload:
    source_filename: str
    moved_srcdiff_xml: str
    move_results: dict[str, Any]
    has_position_data: bool
    files: tuple[VisualizedFile, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "source_filename": self.source_filename,
            "moved_srcdiff_xml": self.moved_srcdiff_xml,
            "move_results": self.move_results,
            "unit_count": len(self.files),
            "has_position_data": self.has_position_data,
            "files": [file.to_dict() for file in self.files],
        }
