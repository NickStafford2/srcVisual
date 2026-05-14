from __future__ import annotations

from io import BytesIO
import xml.etree.ElementTree as ET

from .filenames import normalize_visualized_filename
from .namespaces import DIFF_NS, MV_NS, POS_NS, SRC_NS, prefixed_name
from .units import get_srcdiff_file_unit_elements


CANONICAL_NAMESPACE_PREFIX = {
    SRC_NS: "",
    DIFF_NS: "diff",
    MV_NS: "mv",
    POS_NS: "pos",
}


def restore_original_srcdiff_metadata(
    *,
    original_xml: str,
    generated_xml: str,
) -> str:
    original_root = ET.fromstring(original_xml)
    generated_root = ET.fromstring(generated_xml)
    align_generated_units_to_original(
        original_root=original_root,
        generated_root=generated_root,
    )
    restore_metadata_attributes(
        original_element=original_root,
        generated_element=generated_root,
        path="/",
    )

    original_units = get_srcdiff_file_unit_elements(original_root)
    generated_units = get_srcdiff_file_unit_elements(generated_root)

    for index, (original_unit, generated_unit) in enumerate(
        zip(original_units, generated_units, strict=True),
        start=1,
    ):
        restore_metadata_attributes(
            original_element=original_unit,
            generated_element=generated_unit,
            path=f"/src:unit[{index}]",
        )

    register_serialization_namespaces(
        original_xml=original_xml,
        generated_xml=generated_xml,
    )

    buffer = BytesIO()
    ET.ElementTree(generated_root).write(
        buffer,
        encoding="utf-8",
        xml_declaration=True,
    )
    return buffer.getvalue().decode("utf-8")


def restore_metadata_attributes(
    *,
    original_element: ET.Element,
    generated_element: ET.Element,
    path: str,
) -> None:
    assert original_element.tag == generated_element.tag, (
        "Generated positioned srcdiff changed the XML structure. "
        f"At {path}, original tag={prefixed_name(original_element.tag)!r}, "
        f"generated tag={prefixed_name(generated_element.tag)!r}."
    )

    generated_position_attributes = {
        name: value
        for name, value in generated_element.attrib.items()
        if is_position_attribute(name)
    }
    original_non_position_attributes = {
        name: value
        for name, value in original_element.attrib.items()
        if not is_position_attribute(name)
    }

    generated_element.attrib.clear()
    generated_element.attrib.update(original_non_position_attributes)
    generated_element.attrib.update(generated_position_attributes)


def is_position_attribute(attribute_name: str) -> bool:
    return attribute_name.startswith(f"{{{POS_NS}}}")


def register_serialization_namespaces(
    *,
    original_xml: str,
    generated_xml: str,
) -> None:
    namespace_prefixes = collect_namespace_prefixes(original_xml)

    for uri, prefix in collect_namespace_prefixes(generated_xml).items():
        namespace_prefixes.setdefault(uri, prefix)

    for uri, prefix in namespace_prefixes.items():
        ET.register_namespace(prefix, uri)


def collect_namespace_prefixes(xml: str) -> dict[str, str]:
    namespace_prefixes: dict[str, str] = {}

    for event, namespace_data in ET.iterparse(
        BytesIO(xml.encode("utf-8")),
        events=("start-ns",),
    ):
        _ = event
        prefix, uri = namespace_data

        if uri in namespace_prefixes:
            continue

        namespace_prefixes[uri] = preferred_namespace_prefix(prefix, uri)

    return namespace_prefixes


def preferred_namespace_prefix(prefix: str, uri: str) -> str:
    canonical_prefix = CANONICAL_NAMESPACE_PREFIX.get(uri)

    if canonical_prefix is not None:
        if prefix.startswith("ns"):
            return canonical_prefix

        if not prefix and canonical_prefix == "":
            return canonical_prefix

        if prefix == canonical_prefix:
            return prefix

    return prefix


def align_generated_units_to_original(
    *,
    original_root: ET.Element,
    generated_root: ET.Element,
) -> None:
    original_units = get_srcdiff_file_unit_elements(original_root)
    generated_units = get_srcdiff_file_unit_elements(generated_root)

    if len(original_units) <= 1 or len(generated_units) <= 1:
        return

    generated_by_filename: dict[str, ET.Element] = {}

    for generated_unit in generated_units:
        filename = generated_unit.attrib.get("filename")
        assert isinstance(filename, str) and filename, (
            "Generated positioned srcdiff file unit is missing filename metadata."
        )
        generated_by_filename[normalize_visualized_filename(filename)] = generated_unit

    reordered_units: list[ET.Element] = []

    for original_unit in original_units:
        filename = original_unit.attrib.get("filename")
        assert isinstance(filename, str) and filename, (
            "Original srcdiff file unit is missing filename metadata."
        )
        key = normalize_visualized_filename(filename)
        generated_unit = generated_by_filename.get(key)
        assert generated_unit is not None, (
            "Generated positioned srcdiff is missing a file unit needed to restore "
            f"original order. filename={filename!r}."
        )
        reordered_units.append(generated_unit)

    generated_root[:] = reordered_units
