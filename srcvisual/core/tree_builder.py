from __future__ import annotations

import xml.etree.ElementTree as ET

from .models import SourceSpan, TreeNode, TreeNodeKind
from .namespaces import SKIPPED_TREE_TAGS, prefixed_name
from .spans import build_xml_span_index, parse_position_spans
from .srcdiff_attributes import parse_srcdiff_attributes
from .units import get_srcdiff_file_unit_elements


def build_tree_index(
    moved_srcdiff_xml: str,
    *,
    include_skipped_tags: bool = False,
) -> tuple[dict[int, dict[str, object]], bool]:
    root = ET.fromstring(moved_srcdiff_xml)
    unit_elements = get_srcdiff_file_unit_elements(root)

    xml_span_by_path = build_xml_span_index(
        moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )

    tree_by_unit: dict[int, dict[str, object]] = {}
    has_position_data = False

    for unit_number, unit_element in enumerate(unit_elements, start=1):
        tree = build_tree_node(
            unit_element,
            path=f"/src:unit[{unit_number}]",
            xml_span_by_path=xml_span_by_path,
            include_skipped_tags=include_skipped_tags,
        )

        tree_by_unit[unit_number] = tree.to_dict()
        has_position_data = has_position_data or tree_has_positions(tree)

    return tree_by_unit, has_position_data


def build_tree_node(
    element: ET.Element,
    *,
    path: str,
    xml_span_by_path: dict[str, SourceSpan],
    include_skipped_tags: bool = False,
) -> TreeNode:
    tag = prefixed_name(element.tag)
    srcdiff_attributes = parse_srcdiff_attributes(element)

    current_diff_kind = get_current_diff_kind(tag)
    current_move_id = (
        srcdiff_attributes.move.id if srcdiff_attributes.move is not None else None
    )
    current_kind = get_current_kind(
        diff_kind=current_diff_kind,
        move_id=current_move_id,
    )

    revision_0_span, revision_1_span = spans_for_element(element, current_diff_kind)

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

    if revision_0_span is None and should_merge_missing_span(
        diff_kind=current_diff_kind,
        revision="revision_0",
    ):
        revision_0_span = merge_child_spans(child_tuple, "revision_0_span")

    if revision_1_span is None and should_merge_missing_span(
        diff_kind=current_diff_kind,
        revision="revision_1",
    ):
        revision_1_span = merge_child_spans(child_tuple, "revision_1_span")

    assert_expected_spans(
        tag=tag,
        path=path,
        diff_kind=current_diff_kind,
        revision_0_span=revision_0_span,
        revision_1_span=revision_1_span,
        children=child_tuple,
    )

    return TreeNode(
        id=path,
        path=path,
        tag=tag,
        label=build_node_label(tag, element),
        kind=current_kind,
        move_id=current_move_id,
        srcdiff_attributes=srcdiff_attributes,
        xml_span=xml_span_by_path.get(path),
        revision_0_span=revision_0_span,
        revision_1_span=revision_1_span,
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
        assert len(spans) >= 1, "diff:delete must have at least one position span."
        return spans[0], None

    if diff_kind == "insert":
        assert len(spans) >= 1, "diff:insert must have at least one position span."
        return None, spans[0]

    assert len(spans) in {1, 2}, (
        f"Expected one or two position spans for plain/move node; got {len(spans)}."
    )

    if len(spans) == 1:
        return spans[0], spans[0]

    return spans[0], spans[1]


def should_merge_missing_span(
    *,
    diff_kind: str | None,
    revision: str,
) -> bool:
    if diff_kind == "delete":
        return revision == "revision_0"

    if diff_kind == "insert":
        return revision == "revision_1"

    return True


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


def assert_expected_spans(
    *,
    tag: str,
    path: str,
    diff_kind: str | None,
    revision_0_span: SourceSpan | None,
    revision_1_span: SourceSpan | None,
    children: tuple[TreeNode, ...],
) -> None:
    child_has_revision_0 = any(child.revision_0_span is not None for child in children)
    child_has_revision_1 = any(child.revision_1_span is not None for child in children)

    if (
        revision_0_span is None
        and revision_1_span is None
        and not child_has_revision_0
        and not child_has_revision_1
    ):
        return

    if diff_kind == "delete":
        assert revision_0_span is not None, (
            f"Deleted node {tag} at {path} must have a revision_0_span."
        )
        assert revision_1_span is None, (
            f"Deleted node {tag} at {path} must not have a revision_1_span."
        )
        return

    if diff_kind == "insert":
        assert revision_0_span is None, (
            f"Inserted node {tag} at {path} must not have a revision_0_span."
        )
        assert revision_1_span is not None, (
            f"Inserted node {tag} at {path} must have a revision_1_span."
        )
        return

    if child_has_revision_0:
        assert revision_0_span is not None, (
            f"Node {tag} at {path} has revision 0 children but no revision_0_span."
        )

    if child_has_revision_1:
        assert revision_1_span is not None, (
            f"Node {tag} at {path} has revision 1 children but no revision_1_span."
        )


def get_node_span(node: TreeNode, key: str) -> SourceSpan | None:
    if key == "revision_0_span":
        return node.revision_0_span

    if key == "revision_1_span":
        return node.revision_1_span

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
    if node.revision_0_span or node.revision_1_span:
        return True

    return any(tree_has_positions(child) for child in node.children)
