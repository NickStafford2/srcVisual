from __future__ import annotations

import xml.etree.ElementTree as ET

from .models import SourceSpan, TreeNode, TreeNodeKind
from .namespaces import DIFF_NS, MV_NS, SRC_NS, SKIPPED_TREE_TAGS, prefixed_name
from .spans import build_xml_span_index, parse_position_spans


def build_tree_index(
    annotated_srcdiff_xml: str,
    *,
    include_skipped_tags: bool = False,
) -> tuple[dict[str, dict[str, object]], bool]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]

    xml_span_by_path = build_xml_span_index(
        annotated_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )

    index: dict[str, dict[str, object]] = {}
    has_position_data = False

    for unit_number, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename", f"unit-{unit_number}")

        tree = build_tree_node(
            unit_element,
            path=f"/src:unit[{unit_number}]",
            xml_span_by_path=xml_span_by_path,
            include_skipped_tags=include_skipped_tags,
        )

        index[filename] = tree.to_dict()
        has_position_data = has_position_data or tree_has_positions(tree)

    return index, has_position_data


def build_tree_node(
    element: ET.Element,
    *,
    path: str,
    xml_span_by_path: dict[str, SourceSpan],
    include_skipped_tags: bool = False,
) -> TreeNode:
    tag = prefixed_name(element.tag)
    current_diff_kind = get_current_diff_kind(tag)
    current_move_id = element.attrib.get(f"{{{MV_NS}}}id") or element.attrib.get("move")
    current_kind = get_current_kind(
        diff_kind=current_diff_kind,
        move_id=current_move_id,
    )

    before_span, after_span = spans_for_element(element, current_diff_kind)

    children: list[TreeNode] = []
    tag_counts: dict[str, int] = {}

    for child in list(element):
        if should_skip_child(child, include_skipped_tags=include_skipped_tags):
            continue

        child_name = prefixed_name(child.tag)
        tag_counts[child_name] = tag_counts.get(child_name, 0) + 1
        child_path = f"{path}/{child_name}[{tag_counts[child_name]}]"

        children.append(
            build_tree_node(
                child,
                path=child_path,
                xml_span_by_path=xml_span_by_path,
                include_skipped_tags=include_skipped_tags,
            )
        )

    child_tuple = tuple(children)

    if before_span is None:
        before_span = merge_child_spans(child_tuple, "before_span")

    if after_span is None:
        after_span = merge_child_spans(child_tuple, "after_span")

    return TreeNode(
        id=path,
        path=path,
        tag=tag,
        label=build_node_label(tag, element),
        kind=current_kind,
        move_id=current_move_id,
        xml_span=xml_span_by_path.get(path),
        before_span=before_span,
        after_span=after_span,
        children=child_tuple,
    )


def get_current_diff_kind(tag: str) -> str | None:
    if tag == "diff:delete":
        return "delete"

    if tag == "diff:insert":
        return "insert"

    return None


def get_current_kind(
    *,
    diff_kind: str | None,
    move_id: str | None,
) -> TreeNodeKind:
    if move_id:
        return "move"

    if diff_kind == "delete":
        return "delete"

    if diff_kind == "insert":
        return "insert"

    return "plain"


def should_skip_child(
    child: ET.Element,
    *,
    include_skipped_tags: bool,
) -> bool:
    return not include_skipped_tags and child.tag in SKIPPED_TREE_TAGS


def spans_for_element(
    element: ET.Element,
    diff_kind: str | None,
) -> tuple[SourceSpan | None, SourceSpan | None]:
    spans = parse_position_spans(element)

    if spans is None:
        return None, None

    if diff_kind == "delete":
        return spans[0], None

    if diff_kind == "insert":
        return None, spans[0]

    if len(spans) == 1:
        return spans[0], spans[0]

    return spans[0], spans[1]


def merge_child_spans(
    children: tuple[TreeNode, ...],
    key: str,
) -> SourceSpan | None:
    spans: list[SourceSpan] = []

    for child in children:
        span = get_node_span(child, key)

        if span is not None:
            spans.append(span)

    if not spans:
        return None

    start = min(spans, key=lambda span: (span.start_line, span.start_col))
    end = max(spans, key=lambda span: (span.end_line, span.end_col))

    return SourceSpan(
        start_line=start.start_line,
        start_col=start.start_col,
        end_line=end.end_line,
        end_col=end.end_col,
    )


def get_node_span(node: TreeNode, key: str) -> SourceSpan | None:
    if key == "before_span":
        return node.before_span

    if key == "after_span":
        return node.after_span

    if key == "xml_span":
        return node.xml_span

    raise ValueError(f"Unsupported span key: {key}")


def build_node_label(tag: str, element: ET.Element) -> str:
    if tag == "unit" and element.attrib.get("filename"):
        return f"unit: {element.attrib['filename']}"

    preview = build_text_preview(element)

    if preview:
        return f"{tag}: {preview}"

    return tag


def build_text_preview(element: ET.Element) -> str | None:
    if list(element):
        return None

    text = " ".join("".join(element.itertext()).split())

    if not text:
        return None

    if len(text) > 48:
        return f"{text[:45]}..."

    return text


def tree_has_positions(node: TreeNode) -> bool:
    if node.before_span or node.after_span:
        return True

    return any(tree_has_positions(child) for child in node.children)
