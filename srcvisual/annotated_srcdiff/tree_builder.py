from __future__ import annotations

import xml.etree.ElementTree as ET

from srcvisual.annotated_srcdiff.attributes import parse_all_attributes
from srcvisual.annotated_srcdiff.node_helpers import (
    assert_expected_spans,
    build_node_label,
    get_current_diff_kind,
    get_current_kind,
    merge_child_spans,
    should_merge_missing_span,
    should_skip_child,
    spans_for_element,
)
from srcvisual.annotated_srcdiff.tree_node import TreeNode, tree_has_positions
from srcvisual.core.namespaces import prefixed_name
from srcvisual.core.source_span import SourceSpan
from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.srcdiff.xml_spans import build_xml_span_index


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
    srcdiff_attributes = parse_all_attributes(element)

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
