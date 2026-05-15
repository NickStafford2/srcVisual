from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
from xml.parsers import expat

from srcvisual.core.source_span import SourceSpan
from srcvisual.core.namespaces import (
    POS_END,
    POS_START,
    prefixed_name_from_expat,
    skipped_tree_tag_names,
)
from srcvisual.core.units import is_single_file_srcdiff_root
import xml.etree.ElementTree as ET


def build_xml_span_index(
    moved_srcdiff_xml: str,
    *,
    include_skipped_tags: bool = False,
) -> dict[str, SourceSpan]:
    root = ET.fromstring(moved_srcdiff_xml)
    root_is_file_unit = is_single_file_srcdiff_root(root)
    xml_bytes = moved_srcdiff_xml.encode("utf-8")
    line_start_offsets = compute_line_start_offsets(xml_bytes)

    spans: dict[str, SourceSpan] = {}
    skipped_names = set() if include_skipped_tags else skipped_tree_tag_names()

    parser = expat.ParserCreate(namespace_separator="|")
    nested_unit_count = 0

    @dataclass
    class Frame:
        tag: str
        path: str | None
        start_byte: int
        child_counts: dict[str, int]

    stack: list[Frame] = []

    def start_element(name: str, attrs: dict[str, str]) -> None:
        nonlocal nested_unit_count
        del attrs

        tag = prefixed_name_from_expat(name)
        start_byte = parser.CurrentByteIndex

        if not stack:
            path = "/src:unit[1]" if root_is_file_unit and tag == "unit" else None
        elif (
            not root_is_file_unit
            and len(stack) == 1
            and stack[0].tag == "unit"
            and tag == "unit"
        ):
            nested_unit_count += 1
            path = f"/src:unit[{nested_unit_count}]"
        elif stack[-1].path is not None and tag not in skipped_names:
            parent = stack[-1]
            parent.child_counts[tag] = parent.child_counts.get(tag, 0) + 1
            path = f"{parent.path}/{tag}[{parent.child_counts[tag]}]"
        else:
            path = None

        stack.append(
            Frame(
                tag=tag,
                path=path,
                start_byte=start_byte,
                child_counts={},
            )
        )

    def end_element(name: str) -> None:
        del name

        frame = stack.pop()

        if frame.path is None:
            return

        end_tag_start = parser.CurrentByteIndex
        close_byte = xml_bytes.find(b">", end_tag_start)

        if close_byte == -1:
            return

        start_line, start_col = offset_to_line_col(
            frame.start_byte,
            line_start_offsets,
        )
        end_line, end_col = offset_to_line_col(close_byte, line_start_offsets)

        spans[frame.path] = SourceSpan(
            start_line=start_line,
            start_col=start_col,
            end_line=end_line,
            end_col=end_col + 1,
        )

    parser.StartElementHandler = start_element
    parser.EndElementHandler = end_element
    parser.Parse(xml_bytes, True)

    return spans


def compute_line_start_offsets(xml_bytes: bytes) -> list[int]:
    offsets = [0]

    for index, byte in enumerate(xml_bytes):
        if byte == 10:
            offsets.append(index + 1)

    return offsets


def offset_to_line_col(offset: int, line_start_offsets: list[int]) -> tuple[int, int]:
    line_index = bisect_right(line_start_offsets, offset) - 1
    line_start = line_start_offsets[line_index]

    return line_index + 1, offset - line_start + 1
