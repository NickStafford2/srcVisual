from __future__ import annotations

from collections.abc import Iterable
import re
import xml.etree.ElementTree as ET

from srcvisual.annotated_srcdiff.tree_node import TreeNodeDict
from srcvisual.core.namespaces import SRC_NS, SKIPPED_TREE_TAGS, prefixed_name
from srcvisual.core.units import get_srcdiff_file_unit_elements, is_single_file_srcdiff_root
from srcvisual.files.models import VisualizedFile

NAMESPACE_DECLARATION_PATTERN = re.compile(
    r'\sxmlns(?::(?P<prefix>[A-Za-z_][\w.\-]*))?="(?P<uri>[^"]+)"'
)


def build_pruned_srcdiff_xml(
    *,
    moved_srcdiff_xml: str,
    visualized_files: Iterable[VisualizedFile],
    include_skipped_tags: bool,
) -> str:
    _kept_paths = build_kept_tree_paths(visualized_files)
    _root = ET.fromstring(moved_srcdiff_xml)

    _register_namespaces(moved_srcdiff_xml)

    if is_single_file_srcdiff_root(_root):
        if "/src:unit[1]" not in _kept_paths:
            return _serialize_empty_srcdiff_document()

        _prune_children(
            element=_root,
            path="/src:unit[1]",
            kept_paths=_kept_paths,
            include_skipped_tags=include_skipped_tags,
        )
        _ensure_non_self_closing_unit(_root)
        return ET.tostring(
            _root,
            encoding="unicode",
            xml_declaration=True,
        )

    _unit_elements = get_srcdiff_file_unit_elements(_root)
    _previous_kept_unit: ET.Element | None = None

    for _unit_index, _unit_element in enumerate(_unit_elements, start=1):
        _unit_path = f"/src:unit[{_unit_index}]"

        if _unit_path not in _kept_paths:
            _remove_child(
                parent=_root,
                child=_unit_element,
                previous_kept_sibling=_previous_kept_unit,
                keep_child_text=False,
            )
            continue

        _prune_children(
            element=_unit_element,
            path=_unit_path,
            kept_paths=_kept_paths,
            include_skipped_tags=include_skipped_tags,
        )
        _ensure_non_self_closing_unit(_unit_element)
        _previous_kept_unit = _unit_element

    if not get_srcdiff_file_unit_elements(_root):
        return _serialize_empty_srcdiff_document()

    return ET.tostring(
        _root,
        encoding="unicode",
        xml_declaration=True,
    )


def build_kept_tree_paths(
    visualized_files: Iterable[VisualizedFile],
) -> set[str]:
    _kept_paths: set[str] = set()

    for _visualized_file in visualized_files:
        _tree = _visualized_file.tree

        if _tree is None:
            continue

        _collect_tree_paths(_tree, _kept_paths)

    return _kept_paths


def _collect_tree_paths(
    node: TreeNodeDict,
    kept_paths: set[str],
) -> None:
    kept_paths.add(node["path"])

    for _child in node["children"]:
        _collect_tree_paths(_child, kept_paths)


def _prune_children(
    *,
    element: ET.Element,
    path: str,
    kept_paths: set[str],
    include_skipped_tags: bool,
) -> None:
    _tag_counts: dict[str, int] = {}
    _previous_kept_sibling: ET.Element | None = None

    for _child in list(element):
        if not include_skipped_tags and _child.tag in SKIPPED_TREE_TAGS:
            _remove_child(
                parent=element,
                child=_child,
                previous_kept_sibling=_previous_kept_sibling,
                keep_child_text=True,
            )
            continue

        _child_name = prefixed_name(_child.tag)
        _tag_counts[_child_name] = _tag_counts.get(_child_name, 0) + 1
        _child_path = f"{path}/{_child_name}[{_tag_counts[_child_name]}]"

        if _child_path not in kept_paths:
            _remove_child(
                parent=element,
                child=_child,
                previous_kept_sibling=_previous_kept_sibling,
                keep_child_text=False,
            )
            continue

        _prune_children(
            element=_child,
            path=_child_path,
            kept_paths=kept_paths,
            include_skipped_tags=include_skipped_tags,
        )
        _previous_kept_sibling = _child


def _register_namespaces(xml_text: str) -> None:
    for _match in NAMESPACE_DECLARATION_PATTERN.finditer(xml_text):
        _prefix = _match.group("prefix") or ""
        _uri = _match.group("uri")
        ET.register_namespace(_prefix, _uri)


def _ensure_non_self_closing_unit(element: ET.Element) -> None:
    if len(element) != 0:
        return

    if element.text is not None and element.text.strip():
        return

    element.text = "\n"


def _remove_child(
    *,
    parent: ET.Element,
    child: ET.Element,
    previous_kept_sibling: ET.Element | None,
    keep_child_text: bool,
) -> None:
    _preserved_text = ""

    if keep_child_text:
        _preserved_text += "".join(child.itertext())

    _preserved_text += child.tail or ""

    if _preserved_text:
        if previous_kept_sibling is None:
            parent.text = (parent.text or "") + _preserved_text
        else:
            previous_kept_sibling.tail = (
                (previous_kept_sibling.tail or "") + _preserved_text
            )

    parent.remove(child)


def _serialize_empty_srcdiff_document() -> str:
    _root = ET.Element(f"{{{SRC_NS}}}srcdiff")
    _root.text = "\n"
    return ET.tostring(
        _root,
        encoding="unicode",
        xml_declaration=True,
    )
