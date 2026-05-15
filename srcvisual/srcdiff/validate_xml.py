from __future__ import annotations

from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.srcdiff.xml_spans import build_xml_span_index
import xml.etree.ElementTree as ET


def validate_xml_span_index(
    *,
    moved_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> None:
    _spans = build_xml_span_index(
        moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )

    if not _spans:
        _root = ET.fromstring(moved_srcdiff_xml)
        assert not get_srcdiff_file_unit_elements(_root), (
            "XML span index is empty for moved srcdiff XML that still contains file units."
        )
        return

    for _path, _span in _spans.items():
        assert _path.startswith("/src:unit["), f"Invalid XML span path: {_path!r}."
        assert (_span.start_line, _span.start_col) <= (
            _span.end_line,
            _span.end_col,
        ), f"Invalid XML span ordering at {_path}: {_span}."
