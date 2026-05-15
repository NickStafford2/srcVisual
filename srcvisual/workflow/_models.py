from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from srcvisual.files.models import VisualizedFile


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
