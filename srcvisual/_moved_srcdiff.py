from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from .core._srcmove_results import build_filename_to_unit_index
from .core.srcdiff_attributes import MV_ID
from .core.validation import collect_xml_move_regions


def has_srcmove_annotations(srcdiff_xml: str) -> bool:
    _root = ET.fromstring(srcdiff_xml)

    return any(MV_ID in _element.attrib for _element in _root.iter())


def build_move_results_from_moved_srcdiff(
    *,
    moved_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> dict[str, Any]:
    _filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)

    _xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=_filename_to_unit_index,
    )

    _grouped_regions: dict[str, list[Any]] = {}

    for _region in _xml_regions.values():
        _grouped_regions.setdefault(_region.move_id, []).append(_region)

    _moves: list[dict[str, Any]] = []

    for _move_id in sorted(_grouped_regions):
        _regions = sorted(_grouped_regions[_move_id], key=lambda _region: _region.path)

        _from_regions = [
            _region for _region in _regions if _region.tag == "diff:delete"
        ]
        _to_regions = [
            _region for _region in _regions if _region.tag == "diff:insert"
        ]

        assert _from_regions, (
            f"Existing srcMove annotation {_move_id!r} has no diff:delete region."
        )
        assert _to_regions, (
            f"Existing srcMove annotation {_move_id!r} has no diff:insert region."
        )

        _moves.append(
            {
                "move_id": _move_id,
                "from_xpaths": [_region.path for _region in _from_regions],
                "to_xpaths": [_region.path for _region in _to_regions],
                "from_raw_texts": [_region.raw_text for _region in _from_regions],
                "to_raw_texts": [_region.raw_text for _region in _to_regions],
            }
        )

    return {
        "move_count": len(_moves),
        "annotated_regions": len(_xml_regions),
        "moves": _moves,
    }
