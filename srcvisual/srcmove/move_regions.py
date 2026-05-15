from __future__ import annotations

from dataclasses import dataclass
import xml.etree.ElementTree as ET

from srcvisual.core.namespaces import (
    POS_END,
    POS_START,
    SKIPPED_TREE_TAGS,
    prefixed_name,
)
from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.srcmove.attributes import MV_FROM, MV_ID, MV_TO
from srcvisual.srcmove.srcmove_results import (
    normalize_srcmove_xpath_tuple,
    parse_xml_move_reference_list,
)


@dataclass(frozen=True)
class XmlMoveRegion:
    path: str
    tag: str
    move_id: str
    raw_text: str
    from_paths: tuple[str, ...]
    to_paths: tuple[str, ...]
    position_start: str | None
    position_end: str | None


def collect_xml_move_regions(
    *,
    moved_srcdiff_xml: str,
    include_skipped_tags: bool,
    filename_to_unit_index: dict[str, int],
) -> dict[str, XmlMoveRegion]:
    root = ET.fromstring(moved_srcdiff_xml)
    unit_elements = get_srcdiff_file_unit_elements(root)
    regions: dict[str, XmlMoveRegion] = {}

    for unit_number, unit_element in enumerate(unit_elements, start=1):
        collect_xml_move_regions_from_element(
            element=unit_element,
            path=f"/src:unit[{unit_number}]",
            include_skipped_tags=include_skipped_tags,
            filename_to_unit_index=filename_to_unit_index,
            regions=regions,
        )

    return regions


def collect_xml_move_regions_from_element(
    *,
    element: ET.Element,
    path: str,
    include_skipped_tags: bool,
    filename_to_unit_index: dict[str, int],
    regions: dict[str, XmlMoveRegion],
) -> None:
    move_id = element.attrib.get(MV_ID)

    if move_id is not None:
        assert move_id, f"Empty mv:id at {path}."

        assert path not in regions, (
            f"Duplicate XML move region path while collecting srcMove regions: {path}."
        )

        regions[path] = XmlMoveRegion(
            path=path,
            tag=prefixed_name(element.tag),
            move_id=move_id,
            raw_text=extract_raw_text(element),
            from_paths=normalize_srcmove_xpath_tuple(
                parse_xml_move_reference_list(element.attrib.get(MV_FROM)),
                filename_to_unit_index=filename_to_unit_index,
            ),
            to_paths=normalize_srcmove_xpath_tuple(
                parse_xml_move_reference_list(element.attrib.get(MV_TO)),
                filename_to_unit_index=filename_to_unit_index,
            ),
            position_start=element.attrib.get(POS_START),
            position_end=element.attrib.get(POS_END),
        )

    tag_counts: dict[str, int] = {}

    for child in list(element):
        if not include_skipped_tags and child.tag in SKIPPED_TREE_TAGS:
            continue

        child_name = prefixed_name(child.tag)
        tag_counts[child_name] = tag_counts.get(child_name, 0) + 1
        child_path = f"{path}/{child_name}[{tag_counts[child_name]}]"

        collect_xml_move_regions_from_element(
            element=child,
            path=child_path,
            include_skipped_tags=include_skipped_tags,
            filename_to_unit_index=filename_to_unit_index,
            regions=regions,
        )


def extract_raw_text(element: ET.Element) -> str:
    return "".join(element.itertext())
