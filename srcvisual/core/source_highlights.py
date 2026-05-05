from __future__ import annotations

import xml.etree.ElementTree as ET

from .models import SourceHighlightRegion, SourceSpan
from .namespaces import MV_NS, SKIPPED_TREE_TAGS, SRC_NS, prefixed_name
from .spans import parse_position_spans

MV_ID = f"{{{MV_NS}}}id"


def build_move_source_highlights(
    annotated_srcdiff_xml: str,
) -> tuple[SourceHighlightRegion, ...]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]

    regions: list[SourceHighlightRegion] = []

    for unit_id, unit_element in enumerate(unit_elements, start=1):
        collect_move_source_highlights_from_element(
            element=unit_element,
            path=f"/src:unit[{unit_id}]",
            unit_id=unit_id,
            regions=regions,
            annotated_srcdiff_xml=annotated_srcdiff_xml,
        )

    return tuple(regions)


def collect_move_source_highlights_from_element(
    *,
    element: ET.Element,
    path: str,
    unit_id: int,
    regions: list[SourceHighlightRegion],
    annotated_srcdiff_xml: str,
) -> None:
    tag = prefixed_name(element.tag)
    move_id = element.attrib.get(MV_ID)

    if move_id and tag in {"diff:delete", "diff:insert"}:
        span = get_endpoint_span(
            element,
            path=path,
            annotated_srcdiff_xml=annotated_srcdiff_xml,
        )

        regions.append(
            SourceHighlightRegion(
                path=path,
                unit_id=unit_id,
                move_id=move_id,
                revision="revision_0" if tag == "diff:delete" else "revision_1",
                span=span,
            )
        )

    tag_counts: dict[str, int] = {}

    for child in list(element):
        child_name = prefixed_name(child.tag)
        tag_counts[child_name] = tag_counts.get(child_name, 0) + 1
        child_path = f"{path}/{child_name}[{tag_counts[child_name]}]"

        collect_move_source_highlights_from_element(
            element=child,
            path=child_path,
            unit_id=unit_id,
            regions=regions,
            annotated_srcdiff_xml=annotated_srcdiff_xml,
        )


def get_endpoint_span(
    element: ET.Element,
    *,
    path: str,
    annotated_srcdiff_xml: str,
) -> SourceSpan:
    spans = parse_position_spans(element)
    if spans is not None:
        return spans[0]

    child_spans: list[SourceSpan] = []

    tag_counts: dict[str, int] = {}

    for child in list(element):
        if child.tag in SKIPPED_TREE_TAGS:
            continue
        child_name = prefixed_name(child.tag)
        tag_counts[child_name] = tag_counts.get(child_name, 0) + 1
        child_path = f"{path}/{child_name}[{tag_counts[child_name]}]"
        child_span = get_endpoint_span(
            child,
            path=child_path,
            annotated_srcdiff_xml=annotated_srcdiff_xml,
        )
        child_spans.append(child_span)

    assert child_spans, f"Move endpoint is missing position data at xpath: {path}"

    start = min(child_spans, key=lambda span: (span.start_line, span.start_col))
    end = max(child_spans, key=lambda span: (span.end_line, span.end_col))

    return SourceSpan(
        start_line=start.start_line,
        start_col=start.start_col,
        end_line=end.end_line,
        end_col=end.end_col,
    )
