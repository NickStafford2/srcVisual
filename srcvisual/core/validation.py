from __future__ import annotations

from dataclasses import dataclass
import xml.etree.ElementTree as ET

from .models import RevisionFile, VisualizedFile, VisualizationPayload
from .namespaces import (
    POS_END,
    POS_START,
    SRC_NS,
    SKIPPED_TREE_TAGS,
    prefixed_name,
)
from .spans import build_xml_span_index
from .srcdiff_attributes import MV_ID


@dataclass(frozen=True)
class XmlMoveNode:
    path: str
    tag: str
    move_id: str
    position_start: str | None
    position_end: str | None


@dataclass(frozen=True)
class TreeMoveNode:
    path: str
    tag: str
    move_id: str
    kind: str
    position_start: str | None
    position_end: str | None
    xml_span: dict[str, int] | None
    revision_0_span: dict[str, int] | None
    revision_1_span: dict[str, int] | None


def validate_annotated_srcdiff_and_tree(
    *,
    annotated_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    visualized_files: tuple[VisualizedFile, ...],
    include_skipped_tags: bool,
) -> None:
    assert annotated_srcdiff_xml.strip(), "Annotated srcdiff XML is empty."

    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]

    assert len(unit_elements) == len(revision_files), (
        "Annotated srcdiff unit count does not match extracted revision file count. "
        f"srcdiff units={len(unit_elements)}, revision_files={len(revision_files)}."
    )

    assert len(visualized_files) == len(revision_files), (
        "Visualized file count does not match extracted revision file count. "
        f"visualized_files={len(visualized_files)}, revision_files={len(revision_files)}."
    )

    xml_moves = collect_xml_move_nodes(
        annotated_srcdiff_xml=annotated_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )
    tree_moves = collect_tree_move_nodes(visualized_files)

    assert xml_moves, (
        "No mv:id attributes were found in the annotated srcdiff XML. "
        "If this sample is expected to contain moves, srcMove did not annotate them."
    )

    assert tree_moves, (
        "No move nodes were found in the tree payload. "
        "The annotated srcdiff XML contains moves, but the tree builder did not expose them."
    )

    assert set(xml_moves) == set(tree_moves), (
        "Move node paths differ between annotated srcdiff XML and tree payload. "
        f"Only in XML: {sorted(set(xml_moves) - set(tree_moves))}. "
        f"Only in tree: {sorted(set(tree_moves) - set(xml_moves))}."
    )

    for path in sorted(xml_moves):
        xml_move = xml_moves[path]
        tree_move = tree_moves[path]

        assert tree_move.kind == "move", (
            f"Tree node at {path} has mv:id={tree_move.move_id!r} "
            f"but kind={tree_move.kind!r}; expected kind='move'."
        )

        assert xml_move.tag == tree_move.tag, (
            f"Move tag mismatch at {path}: "
            f"XML tag={xml_move.tag!r}, tree tag={tree_move.tag!r}."
        )

        assert xml_move.move_id == tree_move.move_id, (
            f"Move id mismatch at {path}: "
            f"XML mv:id={xml_move.move_id!r}, tree move_id={tree_move.move_id!r}."
        )

        assert xml_move.position_start == tree_move.position_start, (
            f"Move pos:start mismatch at {path}: "
            f"XML={xml_move.position_start!r}, tree={tree_move.position_start!r}."
        )

        assert xml_move.position_end == tree_move.position_end, (
            f"Move pos:end mismatch at {path}: "
            f"XML={xml_move.position_end!r}, tree={tree_move.position_end!r}."
        )

        assert tree_move.xml_span is not None, (
            f"Move node at {path} is missing xml_span in the tree payload."
        )

        assert tree_move.revision_0_span is not None, (
            f"Move node at {path} is missing revision_0_span."
        )

        assert tree_move.revision_1_span is not None, (
            f"Move node at {path} is missing revision_1_span."
        )

    assert_move_groups_match(xml_moves, tree_moves)


def collect_xml_move_nodes(
    *,
    annotated_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> dict[str, XmlMoveNode]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]

    moves: dict[str, XmlMoveNode] = {}

    for unit_number, unit_element in enumerate(unit_elements, start=1):
        collect_xml_move_nodes_from_element(
            element=unit_element,
            path=f"/src:unit[{unit_number}]",
            include_skipped_tags=include_skipped_tags,
            moves=moves,
        )

    return moves


def collect_xml_move_nodes_from_element(
    *,
    element: ET.Element,
    path: str,
    include_skipped_tags: bool,
    moves: dict[str, XmlMoveNode],
) -> None:
    tag = prefixed_name(element.tag)
    move_id = element.attrib.get(MV_ID)

    if move_id is not None:
        assert move_id, f"Empty mv:id at {path}."

        assert path not in moves, (
            f"Duplicate XML move path while collecting moves: {path}."
        )

        moves[path] = XmlMoveNode(
            path=path,
            tag=tag,
            move_id=move_id,
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

        collect_xml_move_nodes_from_element(
            element=child,
            path=child_path,
            include_skipped_tags=include_skipped_tags,
            moves=moves,
        )


def collect_tree_move_nodes(
    visualized_files: tuple[VisualizedFile, ...],
) -> dict[str, TreeMoveNode]:
    moves: dict[str, TreeMoveNode] = {}

    for visualized_file in visualized_files:
        assert visualized_file.tree is not None, (
            f"Missing tree for unit {visualized_file.revision_file.unit_id} "
            f"({visualized_file.revision_file.filename})."
        )

        collect_tree_move_nodes_from_node(visualized_file.tree, moves)

    return moves


def collect_tree_move_nodes_from_node(
    node: dict[str, object],
    moves: dict[str, TreeMoveNode],
) -> None:
    assert isinstance(node.get("path"), str), f"Tree node has invalid path: {node!r}."
    assert isinstance(node.get("tag"), str), f"Tree node has invalid tag: {node!r}."
    assert isinstance(node.get("kind"), str), f"Tree node has invalid kind: {node!r}."

    path = node["path"]
    tag = node["tag"]
    kind = node["kind"]
    move_id = node.get("move_id")

    assert isinstance(path, str)
    assert isinstance(tag, str)
    assert isinstance(kind, str)

    srcdiff_attributes = node.get("srcdiff_attributes")
    assert isinstance(srcdiff_attributes, dict), (
        f"Tree node at {path} is missing srcdiff_attributes."
    )

    position = srcdiff_attributes.get("position")
    move = srcdiff_attributes.get("move")

    if move_id is not None:
        assert isinstance(move_id, str), (
            f"Tree node at {path} has non-string move_id={move_id!r}."
        )

        assert isinstance(move, dict), (
            f"Tree node at {path} has move_id={move_id!r} "
            "but srcdiff_attributes.move is missing."
        )

        assert move.get("id") == move_id, (
            f"Tree node at {path} has move_id={move_id!r} "
            f"but srcdiff_attributes.move.id={move.get('id')!r}."
        )

        if position is not None:
            assert isinstance(position, dict), (
                f"Tree node at {path} has invalid position attributes: {position!r}."
            )
            position_start = position.get("start")
            position_end = position.get("end")
        else:
            position_start = None
            position_end = None

        assert path not in moves, (
            f"Duplicate tree move path while collecting moves: {path}."
        )

        moves[path] = TreeMoveNode(
            path=path,
            tag=tag,
            move_id=move_id,
            kind=kind,
            position_start=position_start if isinstance(position_start, str) else None,
            position_end=position_end if isinstance(position_end, str) else None,
            xml_span=expect_optional_span_dict(node.get("xml_span"), path, "xml_span"),
            revision_0_span=expect_optional_span_dict(
                node.get("revision_0_span"),
                path,
                "revision_0_span",
            ),
            revision_1_span=expect_optional_span_dict(
                node.get("revision_1_span"),
                path,
                "revision_1_span",
            ),
        )

    children = node.get("children")
    assert isinstance(children, list), f"Tree node at {path} has invalid children."

    for child in children:
        assert isinstance(child, dict), f"Tree node at {path} has non-dict child."
        collect_tree_move_nodes_from_node(child, moves)


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

    expected_keys = {"start_line", "start_col", "end_line", "end_col"}

    assert set(value) == expected_keys, (
        f"Tree node at {path} has invalid {field_name} keys: "
        f"expected {sorted(expected_keys)}, got {sorted(value)}."
    )

    for key in expected_keys:
        assert isinstance(value[key], int), (
            f"Tree node at {path} has non-integer {field_name}.{key}: {value[key]!r}."
        )

    assert_span_order(value, path, field_name)

    return value


def assert_span_order(span: dict[str, int], path: str, field_name: str) -> None:
    start = (span["start_line"], span["start_col"])
    end = (span["end_line"], span["end_col"])

    assert start <= end, (
        f"Tree node at {path} has invalid {field_name}: "
        f"start {start} is after end {end}."
    )


def assert_move_groups_match(
    xml_moves: dict[str, XmlMoveNode],
    tree_moves: dict[str, TreeMoveNode],
) -> None:
    xml_groups: dict[str, set[str]] = {}
    tree_groups: dict[str, set[str]] = {}

    for path, move in xml_moves.items():
        xml_groups.setdefault(move.move_id, set()).add(path)

    for path, move in tree_moves.items():
        tree_groups.setdefault(move.move_id, set()).add(path)

    assert xml_groups == tree_groups, (
        "Move id groupings differ between annotated srcdiff XML and tree payload. "
        f"XML groups={format_move_groups(xml_groups)}. "
        f"Tree groups={format_move_groups(tree_groups)}."
    )

    for move_id, paths in sorted(tree_groups.items()):
        assert len(paths) >= 2, (
            f"Move id {move_id!r} only appears once in the tree payload: "
            f"{sorted(paths)}. Expected a move pair or move group."
        )


def format_move_groups(groups: dict[str, set[str]]) -> dict[str, list[str]]:
    return {move_id: sorted(paths) for move_id, paths in sorted(groups.items())}


def validate_visualization_payload(payload: VisualizationPayload) -> None:
    payload_dict = payload.to_dict()

    assert isinstance(payload_dict["source_filename"], str)
    assert payload_dict["source_filename"]

    assert isinstance(payload_dict["annotated_srcdiff_xml"], str)
    assert payload_dict["annotated_srcdiff_xml"].strip()

    assert isinstance(payload_dict["move_results"], dict)

    assert isinstance(payload_dict["has_position_data"], bool)

    assert isinstance(payload_dict["units"], int)
    assert payload_dict["units"] == len(payload.files)

    assert isinstance(payload_dict["files"], list)
    assert len(payload_dict["files"]) == payload_dict["units"]

    for file_index, file_payload in enumerate(payload_dict["files"]):
        assert isinstance(file_payload, dict), (
            f"files[{file_index}] must be a dictionary."
        )

        assert isinstance(file_payload.get("unit"), int), (
            f"files[{file_index}].unit must be an integer."
        )

        assert file_payload["unit"] == file_index + 1, (
            f"files[{file_index}].unit must be {file_index + 1}; "
            f"got {file_payload['unit']}."
        )

        assert isinstance(file_payload.get("filename"), str), (
            f"files[{file_index}].filename must be a string."
        )

        assert isinstance(file_payload.get("revision_0_source_code"), str), (
            f"files[{file_index}].revision_0_source_code must be a string."
        )

        assert isinstance(file_payload.get("revision_1_source_code"), str), (
            f"files[{file_index}].revision_1_source_code must be a string."
        )

        tree = file_payload.get("tree")
        assert tree is None or isinstance(tree, dict), (
            f"files[{file_index}].tree must be a dictionary or None."
        )

        if tree is not None:
            validate_tree_payload_node(tree)


def validate_tree_payload_node(node: dict[str, object]) -> None:
    required_keys = {
        "id",
        "path",
        "tag",
        "label",
        "kind",
        "move_id",
        "srcdiff_attributes",
        "xml_span",
        "revision_0_span",
        "revision_1_span",
        "children",
    }

    assert set(node) == required_keys, (
        f"Unexpected tree node keys at {node.get('path')!r}: "
        f"expected {sorted(required_keys)}, got {sorted(node)}."
    )

    path = node["path"]

    assert isinstance(node["id"], str)
    assert isinstance(path, str)
    assert node["id"] == path

    assert isinstance(node["tag"], str)
    assert isinstance(node["label"], str)
    assert node["kind"] in {"plain", "insert", "delete", "move"}

    assert node["move_id"] is None or isinstance(node["move_id"], str)

    assert isinstance(node["srcdiff_attributes"], dict)

    expect_optional_span_dict(node["xml_span"], path, "xml_span")
    expect_optional_span_dict(node["revision_0_span"], path, "revision_0_span")
    expect_optional_span_dict(node["revision_1_span"], path, "revision_1_span")

    children = node["children"]
    assert isinstance(children, list)

    for child in children:
        assert isinstance(child, dict), f"Tree node at {path} has non-dict child."
        validate_tree_payload_node(child)


def validate_xml_span_index(
    *,
    annotated_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> None:
    spans = build_xml_span_index(
        annotated_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )

    assert spans, "XML span index is empty."

    for path, span in spans.items():
        assert path.startswith("/src:unit["), f"Invalid XML span path: {path!r}."
        assert (span.start_line, span.start_col) <= (span.end_line, span.end_col), (
            f"Invalid XML span ordering at {path}: {span}."
        )
