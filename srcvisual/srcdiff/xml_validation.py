from __future__ import annotations

from srcvisual.srcdiff.position_spans import build_xml_span_index


def validate_xml_span_index(
    *,
    moved_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> None:
    _spans = build_xml_span_index(
        moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )

    assert _spans, "XML span index is empty."

    for _path, _span in _spans.items():
        assert _path.startswith("/src:unit["), f"Invalid XML span path: {_path!r}."
        assert (_span.start_line, _span.start_col) <= (
            _span.end_line,
            _span.end_col,
        ), f"Invalid XML span ordering at {_path}: {_span}."
