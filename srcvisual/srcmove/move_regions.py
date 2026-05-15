from __future__ import annotations

from dataclasses import dataclass
import xml.etree.ElementTree as ET

from srcvisual.srcmove.srcmove_results import normalize_srcmove_xpath_tuple, parse_xml_move_reference_list
from srcvisual.srcmove.attributes import MV_FROM, MV_ID, MV_TO
from srcvisual.core.namespaces import POS_END, POS_START, SKIPPED_TREE_TAGS, prefixed_name
from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.workflow.models import VisualizedFile


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


@dataclass(frozen=True)
class TreeMoveNode:
    path: str
    tag: str
    move_id: str
    kind: str
    from_paths: tuple[str, ...]
    to_paths: tuple[str, ...]
    position_start: str | None
    position_end: str | None
    xml_span: dict[str, int] | None
    revision_0_span: dict[str, int] | None
    revision_1_span: dict[str, int] | None


def collect_xml_move_regions(
    *,
    moved_srcdiff_xml: str,
    include_skipped_tags: bool,
    filename_to_unit_index: dict[str, int],
) -> dict[str, XmlMoveRegion]:
    _root = ET.fromstring(moved_srcdiff_xml)
    _unit_elements = get_srcdiff_file_unit_elements(_root)
    _regions: dict[str, XmlMoveRegion] = {}

    for _unit_number, _unit_element in enumerate(_unit_elements, start=1):
        collect_xml_move_regions_from_element(
            element=_unit_element,
            path=f"/src:unit[{_unit_number}]",
            include_skipped_tags=include_skipped_tags,
            filename_to_unit_index=filename_to_unit_index,
            regions=_regions,
        )

    return _regions


def collect_xml_move_regions_from_element(
    *,
    element: ET.Element,
    path: str,
    include_skipped_tags: bool,
    filename_to_unit_index: dict[str, int],
    regions: dict[str, XmlMoveRegion],
) -> None:
    _move_id = element.attrib.get(MV_ID)

    if _move_id is not None:
        assert _move_id, f"Empty mv:id at {path}."

        assert path not in regions, (
            f"Duplicate XML move region path while collecting srcMove regions: {path}."
        )

        regions[path] = XmlMoveRegion(
            path=path,
            tag=prefixed_name(element.tag),
            move_id=_move_id,
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

    _tag_counts: dict[str, int] = {}

    for _child in list(element):
        if not include_skipped_tags and _child.tag in SKIPPED_TREE_TAGS:
            continue

        _child_name = prefixed_name(_child.tag)
        _tag_counts[_child_name] = _tag_counts.get(_child_name, 0) + 1
        _child_path = f"{path}/{_child_name}[{_tag_counts[_child_name]}]"

        collect_xml_move_regions_from_element(
            element=_child,
            path=_child_path,
            include_skipped_tags=include_skipped_tags,
            filename_to_unit_index=filename_to_unit_index,
            regions=regions,
        )


def extract_raw_text(element: ET.Element) -> str:
    return "".join(element.itertext())


def collect_tree_move_nodes(
    visualized_files: tuple[VisualizedFile, ...],
    *,
    filename_to_unit_index: dict[str, int],
) -> dict[str, TreeMoveNode]:
    _moves: dict[str, TreeMoveNode] = {}

    for _visualized_file in visualized_files:
        assert _visualized_file.tree is not None, (
            f"Missing tree for unit {_visualized_file.revision_file.unit_id} "
            f"({_visualized_file.revision_file.filename})."
        )

        collect_tree_move_nodes_from_node(
            _visualized_file.tree,
            _moves,
            filename_to_unit_index=filename_to_unit_index,
        )

    return _moves


def collect_tree_move_nodes_from_node(
    node: dict[str, object],
    moves: dict[str, TreeMoveNode],
    *,
    filename_to_unit_index: dict[str, int],
) -> None:
    assert isinstance(node.get("path"), str), f"Tree node has invalid path: {node!r}."
    assert isinstance(node.get("tag"), str), f"Tree node has invalid tag: {node!r}."
    assert isinstance(node.get("kind"), str), f"Tree node has invalid kind: {node!r}."

    _path = node["path"]
    _tag = node["tag"]
    _kind = node["kind"]
    _move_id = node.get("move_id")

    assert isinstance(_path, str)
    assert isinstance(_tag, str)
    assert isinstance(_kind, str)

    _srcdiff_attributes = node.get("srcdiff_attributes")
    assert isinstance(_srcdiff_attributes, dict), (
        f"Tree node at {_path} is missing srcdiff_attributes."
    )

    _position = _srcdiff_attributes.get("position")
    _move = _srcdiff_attributes.get("move")

    if _move_id is not None:
        assert isinstance(_move_id, str), (
            f"Tree node at {_path} has non-string move_id={_move_id!r}."
        )

        assert isinstance(_move, dict), (
            f"Tree node at {_path} has move_id={_move_id!r} "
            "but srcdiff_attributes.move is missing."
        )

        assert _move.get("id") == _move_id, (
            f"Tree node at {_path} has move_id={_move_id!r} "
            f"but srcdiff_attributes.move.id={_move.get('id')!r}."
        )

        _from_paths = _move.get("from_paths")
        _to_paths = _move.get("to_paths")

        assert isinstance(_from_paths, list), (
            f"Tree node at {_path} has invalid move.from_paths."
        )
        assert isinstance(_to_paths, list), (
            f"Tree node at {_path} has invalid move.to_paths."
        )

        for _from_path in _from_paths:
            assert isinstance(_from_path, str), (
                f"Tree node at {_path} has non-string move.from_paths item."
            )

        for _to_path in _to_paths:
            assert isinstance(_to_path, str), (
                f"Tree node at {_path} has non-string move.to_paths item."
            )

        if _position is not None:
            assert isinstance(_position, dict), (
                f"Tree node at {_path} has invalid position attributes: {_position!r}."
            )
            _position_start = _position.get("start")
            _position_end = _position.get("end")
        else:
            _position_start = None
            _position_end = None

        assert _path not in moves, (
            f"Duplicate tree move path while collecting moves: {_path}."
        )

        moves[_path] = TreeMoveNode(
            path=_path,
            tag=_tag,
            move_id=_move_id,
            kind=_kind,
            from_paths=normalize_srcmove_xpath_tuple(
                tuple(_from_paths),
                filename_to_unit_index=filename_to_unit_index,
            ),
            to_paths=normalize_srcmove_xpath_tuple(
                tuple(_to_paths),
                filename_to_unit_index=filename_to_unit_index,
            ),
            position_start=_position_start
            if isinstance(_position_start, str)
            else None,
            position_end=_position_end if isinstance(_position_end, str) else None,
            xml_span=expect_optional_span_dict(node.get("xml_span"), _path, "xml_span"),
            revision_0_span=expect_optional_span_dict(
                node.get("revision_0_span"),
                _path,
                "revision_0_span",
            ),
            revision_1_span=expect_optional_span_dict(
                node.get("revision_1_span"),
                _path,
                "revision_1_span",
            ),
        )

    _children = node.get("children")
    assert isinstance(_children, list), f"Tree node at {_path} has invalid children."

    for _child in _children:
        assert isinstance(_child, dict), f"Tree node at {_path} has non-dict child."
        collect_tree_move_nodes_from_node(
            _child,
            moves,
            filename_to_unit_index=filename_to_unit_index,
        )


def format_move_groups(groups: dict[str, set[str]]) -> dict[str, list[str]]:
    return {_move_id: sorted(_paths) for _move_id, _paths in sorted(groups.items())}


def expect_optional_span_dict(
    value: object,
    path: str,
    field_name: str,
) -> dict[str, int] | None:
    if value is None:
        return None

    assert isinstance(value, dict), (
        f"Tree node at {path} has invalid {field_name}: expected dict or None."
    )

    _expected_keys = {"start_line", "start_col", "end_line", "end_col"}

    assert set(value) == _expected_keys, (
        f"Tree node at {path} has invalid {field_name} keys: "
        f"expected {sorted(_expected_keys)}, got {sorted(value)}."
    )

    for _key in _expected_keys:
        assert isinstance(value[_key], int), (
            f"Tree node at {path} has non-integer {field_name}.{_key}: {value[_key]!r}."
        )

    assert_span_order(value, path, field_name)

    return value


def assert_span_order(span: dict[str, int], path: str, field_name: str) -> None:
    _start = (span["start_line"], span["start_col"])
    _end = (span["end_line"], span["end_col"])

    assert _start <= _end, (
        f"Tree node at {path} has invalid {field_name}: "
        f"start {_start} is after end {_end}."
    )
