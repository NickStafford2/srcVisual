from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str


@dataclass(frozen=True)
class BackendCommandError(Exception):
    argv: tuple[str, ...]
    returncode: int | None
    stdout: str
    stderr: str
    missing_command: str | None = None

    def user_message(self) -> str:
        if self.missing_command:
            return f"Required command not found on PATH: {self.missing_command}"

        details = (
            self.stderr.strip() or self.stdout.strip() or "Unknown command failure."
        )
        command = " ".join(self.argv)

        return f"Backend command failed while running `{command}`: {details}"


@dataclass(frozen=True)
class SourceSpan:
    start_line: int
    start_col: int
    end_line: int
    end_col: int

    def to_dict(self) -> dict[str, int]:
        return {
            "start_line": self.start_line,
            "start_col": self.start_col,
            "end_line": self.end_line,
            "end_col": self.end_col,
        }


TreeNodeKind = Literal["plain", "insert", "delete", "move"]


@dataclass(frozen=True)
class TreeNode:
    id: str
    path: str
    tag: str
    label: str
    kind: TreeNodeKind
    move_id: str | None
    xml_span: SourceSpan | None
    before_span: SourceSpan | None
    after_span: SourceSpan | None
    children: tuple["TreeNode", ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "path": self.path,
            "tag": self.tag,
            "label": self.label,
            "kind": self.kind,
            "move_id": self.move_id,
            "xml_span": self.xml_span.to_dict() if self.xml_span else None,
            "before_span": self.before_span.to_dict() if self.before_span else None,
            "after_span": self.after_span.to_dict() if self.after_span else None,
            "children": [child.to_dict() for child in self.children],
        }


@dataclass(frozen=True)
class RevisionFile:
    unit: int
    filename: str
    language: str | None
    source_code_before: str
    source_code_after: str

    def to_dict(self) -> dict[str, object]:
        return {
            "unit": self.unit,
            "filename": self.filename,
            "language": self.language,
            "source_code_before": self.source_code_before,
            "source_code_after": self.source_code_after,
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
    annotated_srcdiff_xml: str
    has_position_data: bool
    files: tuple[VisualizedFile, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "source_filename": self.source_filename,
            "annotated_srcdiff_xml": self.annotated_srcdiff_xml,
            "units": str(len(self.files)),
            "has_position_data": self.has_position_data,
            "files": [file.to_dict() for file in self.files],
        }
