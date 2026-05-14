from __future__ import annotations

import argparse
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


IGNORED_PREFIXES = {"mv", "pos"}


def collect_ignored_namespace_uris(xml_path: Path) -> set[str]:
    """
    Find the namespace URIs bound to ignored prefixes like mv and pos.

    Example:
      xmlns:mv="http://www.srcML.org/srcDiff/move"

    ElementTree expands mv:foo into:
      {http://www.srcML.org/srcDiff/move}foo

    So we need the URI, not just the prefix.
    """
    ignored_uris: set[str] = set()

    for event, data in ET.iterparse(xml_path, events=("start-ns",)):
        prefix, uri = data
        if prefix in IGNORED_PREFIXES:
            ignored_uris.add(uri)

    return ignored_uris


def parse_xml(xml_path: Path) -> ET.Element:
    try:
        tree = ET.parse(xml_path)
        return tree.getroot()
    except ET.ParseError as exc:
        raise ValueError(f"Failed to parse XML file {xml_path}: {exc}") from exc


def namespace_uri(attr_name: str) -> str | None:
    """
    ElementTree represents namespaced attributes as:
      {namespace-uri}localname
    """
    if attr_name.startswith("{"):
        return attr_name[1:].split("}", 1)[0]

    return None


def filtered_attributes(
    element: ET.Element,
    ignored_namespace_uris: set[str],
) -> dict[str, str]:
    """
    Return attributes after removing mv:* and pos:* attributes.

    xmlns:mv and xmlns:pos do not usually appear here because ElementTree
    treats namespace declarations separately, not as normal attributes.
    """
    result: dict[str, str] = {}

    for name, value in element.attrib.items():
        uri = namespace_uri(name)

        if uri in ignored_namespace_uris:
            continue

        # Fallback in case a parser/source somehow leaves prefixed attrs raw.
        if name.startswith("mv:") or name.startswith("pos:"):
            continue

        if name in {"xmlns:mv", "xmlns:pos"}:
            continue

        result[name] = value

    return result


def normalize_text(value: str | None) -> str:
    """
    Keep this strict by default: text must match exactly except None == "".

    If you want to ignore whitespace-only formatting differences later,
    change this to:
        return (value or "").strip()
    """
    return value or ""


def compare_elements(
    left: ET.Element,
    right: ET.Element,
    left_ignored_uris: set[str],
    right_ignored_uris: set[str],
    path: str = "/",
) -> str | None:
    """
    Return None if elements match.
    Return a mismatch message if they differ.
    """

    if left.tag != right.tag:
        return f"Tag mismatch at {path}: {left.tag!r} != {right.tag!r}"

    left_attrs = filtered_attributes(left, left_ignored_uris)
    right_attrs = filtered_attributes(right, right_ignored_uris)

    if left_attrs != right_attrs:
        return (
            f"Attribute mismatch at {path}\nLeft:  {left_attrs}\nRight: {right_attrs}"
        )

    if normalize_text(left.text) != normalize_text(right.text):
        return (
            f"Text mismatch at {path}\n"
            f"Left:  {normalize_text(left.text)!r}\n"
            f"Right: {normalize_text(right.text)!r}"
        )

    if normalize_text(left.tail) != normalize_text(right.tail):
        return (
            f"Tail text mismatch at {path}\n"
            f"Left:  {normalize_text(left.tail)!r}\n"
            f"Right: {normalize_text(right.tail)!r}"
        )

    left_children = list(left)
    right_children = list(right)

    if len(left_children) != len(right_children):
        return (
            f"Child count mismatch at {path}: "
            f"{len(left_children)} != {len(right_children)}"
        )

    for index, (left_child, right_child) in enumerate(
        zip(left_children, right_children),
        start=1,
    ):
        child_path = f"{path}/{left_child.tag}[{index}]"

        mismatch = compare_elements(
            left_child,
            right_child,
            left_ignored_uris,
            right_ignored_uris,
            child_path,
        )

        if mismatch is not None:
            return mismatch

    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compare two XML files while ignoring mv:* and pos:* attributes, "
            "including xmlns:mv and xmlns:pos namespace declarations."
        )
    )

    parser.add_argument("left_xml", type=Path)
    parser.add_argument("right_xml", type=Path)

    args = parser.parse_args()

    try:
        left_ignored_uris = collect_ignored_namespace_uris(args.left_xml)
        right_ignored_uris = collect_ignored_namespace_uris(args.right_xml)

        left_root = parse_xml(args.left_xml)
        right_root = parse_xml(args.right_xml)

        mismatch = compare_elements(
            left_root,
            right_root,
            left_ignored_uris,
            right_ignored_uris,
        )

        if mismatch is None:
            print("XML files match, ignoring mv:* and pos:* attributes.")
            return 0

        print("XML files do not match.")
        print(mismatch)
        return 1

    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
