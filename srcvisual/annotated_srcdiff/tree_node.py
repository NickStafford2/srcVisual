from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict

from srcvisual.annotated_srcdiff.attributes import AllAttributes
from srcvisual.core.source_span import SourceSpan

TreeNodeKind = Literal["plain", "insert", "delete", "move"]


class SpanDict(TypedDict):
    start_line: int
    start_col: int
    end_line: int
    end_col: int


class TreeNodeDict(TypedDict):
    id: str
    path: str
    tag: str
    label: str
    kind: TreeNodeKind
    move_id: str | None
    srcdiff_attributes: dict[str, object]
    xml_span: SpanDict | None
    revision_0_span: SpanDict | None
    revision_1_span: SpanDict | None
    children: list["TreeNodeDict"]


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

    def to_dict(self) -> TreeNodeDict:
        return {
            "id": self.id,
            "path": self.path,
            "tag": self.tag,
            "label": self.label,
            "kind": self.kind,
            "move_id": self.move_id,
            "srcdiff_attributes": self.srcdiff_attributes.to_dict(),
            "xml_span": span_to_dict(self.xml_span),
            "revision_0_span": span_to_dict(self.revision_0_span),
            "revision_1_span": span_to_dict(self.revision_1_span),
            "children": [child.to_dict() for child in self.children],
        }


def span_to_dict(span: SourceSpan | None) -> SpanDict | None:
    if span is None:
        return None

    return {
        "start_line": span.start_line,
        "start_col": span.start_col,
        "end_line": span.end_line,
        "end_col": span.end_col,
    }


def tree_has_positions(node: TreeNode) -> bool:
    if node.revision_0_span or node.revision_1_span:
        return True

    return any(tree_has_positions(child) for child in node.children)
