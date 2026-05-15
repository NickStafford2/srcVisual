from __future__ import annotations

import xml.etree.ElementTree as ET

from srcvisual.srcdiff.namespaces import SRC_NS

SRC_UNIT_TAG = f"{{{SRC_NS}}}unit"


def get_srcdiff_file_unit_elements(root: ET.Element) -> tuple[ET.Element, ...]:
    nested_units = tuple(child for child in root if child.tag == SRC_UNIT_TAG)

    if nested_units:
        return nested_units

    if is_single_file_srcdiff_root(root):
        return (root,)

    return ()


def is_single_file_srcdiff_root(root: ET.Element) -> bool:
    return root.tag == SRC_UNIT_TAG and bool(root.attrib.get("filename"))
