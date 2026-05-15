from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from srcvisual.moved_srcdiff.attributes import AllAttributes
from srcvisual.srcdiff.source_span import SourceSpan


TreeNodeKind = Literal["plain", "insert", "delete", "move"]


@dataclass(frozen=True)
class TreeNode:
    id: str
    path: str
    tag: str
    label: str
    kind: TreeNodeKind
    move_id: str | None
    srcdiff_attributes: AllAttributes
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
