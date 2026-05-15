from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from srcvisual.srcdiff.attributes import SrcDiffAttributes


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
    srcdiff_attributes: SrcDiffAttributes
    xml_span: SourceSpan | None
    revision_0_span: SourceSpan | None
    revision_1_span: SourceSpan | None
    children: tuple["TreeNode", ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "path": self.path,
            "tag": self.tag,
            "label": self.label,
            "kind": self.kind,
            "move_id": self.move_id,
            "srcdiff_attributes": self.srcdiff_attributes.to_dict(),
            "xml_span": self.xml_span.to_dict() if self.xml_span else None,
            "revision_0_span": self.revision_0_span.to_dict()
            if self.revision_0_span
            else None,
            "revision_1_span": self.revision_1_span.to_dict()
            if self.revision_1_span
            else None,
            "children": [child.to_dict() for child in self.children],
        }
