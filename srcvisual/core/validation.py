from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any
import xml.etree.ElementTree as ET

from .models import RevisionFile, VisualizedFile, VisualizationPayload
from .namespaces import POS_END, POS_START, SKIPPED_TREE_TAGS, prefixed_name
from .spans import build_xml_span_index
from .srcmove_paths import split_srcmove_path_list
from .srcdiff_attributes import MV_FROM, MV_ID, MV_TO
from .units import get_srcdiff_file_unit_elements


FILENAME_UNIT_PATTERN = re.compile(
    r"^/src:unit\[@filename=(?P<quote>['\"])(?P<filename>.*?)(?P=quote)\](?P<rest>/.*)?$"
)


@dataclass(frozen=True)
class SrcMoveResultMove:
    move_id: str
    from_xpaths: tuple[str, ...]
    to_xpaths: tuple[str, ...]
    from_raw_texts: tuple[str, ...]
    to_raw_texts: tuple[str, ...]


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


def validate_srcmove_results_match_xml(
    *,
    moved_srcdiff_xml: str,
    move_results: dict[str, Any],
    include_skipped_tags: bool,
) -> None:
    filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)

    result_moves = parse_srcmove_result_moves(
        move_results,
        filename_to_unit_index=filename_to_unit_index,
    )

    xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=filename_to_unit_index,
    )

    assert move_results.get("move_count") == len(result_moves), (
        "srcMove results move_count does not match moves length. "
        f"move_count={move_results.get('move_count')!r}, "
        f"moves length={len(result_moves)}."
    )

    result_move_ids = {move.move_id for move in result_moves}
    xml_move_ids = {region.move_id for region in xml_regions.values()}

    assert result_move_ids == xml_move_ids, (
        "Move ids differ between results.json and moved XML. "
        f"Only in results.json: {sorted(result_move_ids - xml_move_ids)}. "
        f"Only in XML: {sorted(xml_move_ids - result_move_ids)}."
    )

    for move in result_moves:
        validate_single_srcmove_result_move(
            move=move,
            xml_regions=xml_regions,
        )

    result_paths: set[str] = set()

    for move in result_moves:
        result_paths.update(move.from_xpaths)
        result_paths.update(move.to_xpaths)

    xml_paths = set(xml_regions)

    assert result_paths == xml_paths, (
        "Move region paths differ between results.json and moved XML. "
        f"Only in results.json: {sorted(result_paths - xml_paths)}. "
        f"Only in XML: {sorted(xml_paths - result_paths)}."
    )


def validate_moved_srcdiff_and_tree(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    visualized_files: tuple[VisualizedFile, ...],
    include_skipped_tags: bool,
) -> None:
    assert moved_srcdiff_xml.strip(), "Moved srcdiff XML is empty."

    root = ET.fromstring(moved_srcdiff_xml)
    unit_elements = get_srcdiff_file_unit_elements(root)

    assert len(unit_elements) == len(revision_files), (
        "Moved srcdiff unit count does not match extracted revision file count. "
        f"srcdiff units={len(unit_elements)}, revision_files={len(revision_files)}."
    )

    assert len(visualized_files) == len(revision_files), (
        "Visualized file count does not match extracted revision file count. "
        f"visualized_files={len(visualized_files)}, revision_files={len(revision_files)}."
    )

    for unit_index, (unit_element, visualized_file) in enumerate(
        zip(unit_elements, visualized_files, strict=True),
        start=1,
    ):
        expected_filename = unit_element.attrib.get("filename")

        assert visualized_file.revision_file.unit_id == unit_index, (
            "Visualized file unit_id does not match moved srcdiff unit order. "
            f"expected unit_id={unit_index}, "
            f"got {visualized_file.revision_file.unit_id}."
        )

        if expected_filename is not None:
            assert visualized_file.revision_file.filename == expected_filename, (
                "Visualized file filename does not match moved srcdiff unit. "
                f"unit {unit_index} expected filename={expected_filename!r}, "
                f"got {visualized_file.revision_file.filename!r}."
            )

        tree = visualized_file.tree

        if tree is not None:
            assert tree.get("path") == f"/src:unit[{unit_index}]", (
                "Visualized tree root path does not match moved srcdiff unit "
                f"order for filename {visualized_file.revision_file.filename!r}. "
                f"tree path={tree.get('path')!r}."
            )

            if expected_filename is not None:
                assert tree.get("label") == f"unit: {expected_filename}", (
                    "Visualized tree root label does not match moved srcdiff "
                    f"unit filename {expected_filename!r}. "
                    f"tree label={tree.get('label')!r}."
                )

    filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)

    xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=filename_to_unit_index,
    )
    tree_moves = collect_tree_move_nodes(
        visualized_files,
        filename_to_unit_index=filename_to_unit_index,
    )

    assert set(xml_regions) == set(tree_moves), (
        "Move node paths differ between moved srcdiff XML and tree payload. "
        f"Only in XML: {sorted(set(xml_regions) - set(tree_moves))}. "
        f"Only in tree: {sorted(set(tree_moves) - set(xml_regions))}."
    )

    for path in sorted(xml_regions):
        xml_region = xml_regions[path]
        tree_move = tree_moves[path]

        assert tree_move.kind == "move", (
            f"Tree node at {path} has mv:id={tree_move.move_id!r} "
            f"but kind={tree_move.kind!r}; expected kind='move'."
        )

        assert xml_region.tag == tree_move.tag, (
            f"Move tag mismatch at {path}: "
            f"XML tag={xml_region.tag!r}, tree tag={tree_move.tag!r}."
        )

        assert xml_region.move_id == tree_move.move_id, (
            f"Move id mismatch at {path}: "
            f"XML mv:id={xml_region.move_id!r}, tree move_id={tree_move.move_id!r}."
        )

        assert xml_region.from_paths == tree_move.from_paths, (
            f"Move mv:from mismatch at {path}: "
            f"XML={xml_region.from_paths!r}, tree={tree_move.from_paths!r}."
        )

        assert xml_region.to_paths == tree_move.to_paths, (
            f"Move mv:to mismatch at {path}: "
            f"XML={xml_region.to_paths!r}, tree={tree_move.to_paths!r}."
        )

        assert xml_region.position_start == tree_move.position_start, (
            f"Move pos:start mismatch at {path}: "
            f"XML={xml_region.position_start!r}, tree={tree_move.position_start!r}."
        )

        assert xml_region.position_end == tree_move.position_end, (
            f"Move pos:end mismatch at {path}: "
            f"XML={xml_region.position_end!r}, tree={tree_move.position_end!r}."
        )

        assert tree_move.xml_span is not None, (
            f"Move node at {path} is missing xml_span in the tree payload."
        )

    assert_move_groups_match(xml_regions, tree_moves)


def build_filename_to_unit_index(moved_srcdiff_xml: str) -> dict[str, int]:
    root = ET.fromstring(moved_srcdiff_xml)
    unit_elements = get_srcdiff_file_unit_elements(root)

    filename_to_unit_index: dict[str, int] = {}
    duplicate_filenames: set[str] = set()

    for unit_index, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename")

        if filename is None:
            continue

        if filename in filename_to_unit_index:
            duplicate_filenames.add(filename)
            continue

        filename_to_unit_index[filename] = unit_index

    for filename in duplicate_filenames:
        del filename_to_unit_index[filename]

    return filename_to_unit_index


def normalize_srcmove_xpath(
    xpath: str,
    *,
    filename_to_unit_index: dict[str, int],
) -> str:
    match = FILENAME_UNIT_PATTERN.match(xpath)

    if match is None:
        return normalize_src_prefixes_for_internal_path(xpath)

    filename = match.group("filename")
    rest = match.group("rest") or ""

    assert filename in filename_to_unit_index, (
        f"srcMove xpath references filename {filename!r}, but that filename "
        "is missing or ambiguous in the moved srcdiff XML units. "
        "Prefer /src:unit[index] paths for srcMove references when duplicate "
        "filenames exist."
    )

    normalized_xpath = f"/src:unit[{filename_to_unit_index[filename]}]{rest}"
    return normalize_src_prefixes_for_internal_path(normalized_xpath)


def normalize_src_prefixes_for_internal_path(xpath: str) -> str:
    if not xpath.startswith("/src:unit["):
        return xpath

    unit_prefix = "/src:unit["
    close_index = xpath.find("]")

    if close_index == -1:
        return xpath

    head = xpath[: close_index + 1]
    tail = xpath[close_index + 1 :]

    return head + tail.replace("/src:", "/").replace("[src:", "[")


def normalize_srcmove_xpath_tuple(
    xpaths: tuple[str, ...],
    *,
    filename_to_unit_index: dict[str, int],
) -> tuple[str, ...]:
    return tuple(
        normalize_srcmove_xpath(
            xpath,
            filename_to_unit_index=filename_to_unit_index,
        )
        for xpath in xpaths
    )


def parse_srcmove_result_moves(
    move_results: dict[str, Any],
    *,
    filename_to_unit_index: dict[str, int],
) -> tuple[SrcMoveResultMove, ...]:
    assert isinstance(move_results, dict), (
        f"srcMove results must be a dict; got {type(move_results).__name__}."
    )

    moves_value = move_results.get("moves")
    assert isinstance(moves_value, list), "srcMove results must contain moves list."

    parsed_moves: list[SrcMoveResultMove] = []
    seen_move_ids: set[str] = set()

    for index, value in enumerate(moves_value):
        assert isinstance(value, dict), (
            f"srcMove results moves[{index}] must be a dict."
        )

        move_id = value.get("move_id")
        assert isinstance(move_id, str) and move_id, (
            f"srcMove results moves[{index}].move_id must be a non-empty string."
        )

        assert move_id not in seen_move_ids, (
            f"Duplicate move_id in srcMove results: {move_id!r}."
        )
        seen_move_ids.add(move_id)

        from_xpaths = normalize_srcmove_xpath_tuple(
            expect_string_tuple(value, "from_xpaths", index),
            filename_to_unit_index=filename_to_unit_index,
        )
        to_xpaths = normalize_srcmove_xpath_tuple(
            expect_string_tuple(value, "to_xpaths", index),
            filename_to_unit_index=filename_to_unit_index,
        )
        from_raw_texts = expect_string_tuple(value, "from_raw_texts", index)
        to_raw_texts = expect_string_tuple(value, "to_raw_texts", index)

        assert from_xpaths, f"srcMove move {move_id!r} has no from_xpaths."
        assert to_xpaths, f"srcMove move {move_id!r} has no to_xpaths."

        assert len(from_xpaths) == len(from_raw_texts), (
            f"srcMove move {move_id!r} has mismatched from_xpaths/from_raw_texts "
            f"counts: {len(from_xpaths)} vs {len(from_raw_texts)}."
        )

        assert len(to_xpaths) == len(to_raw_texts), (
            f"srcMove move {move_id!r} has mismatched to_xpaths/to_raw_texts "
            f"counts: {len(to_xpaths)} vs {len(to_raw_texts)}."
        )

        parsed_moves.append(
            SrcMoveResultMove(
                move_id=move_id,
                from_xpaths=from_xpaths,
                to_xpaths=to_xpaths,
                from_raw_texts=from_raw_texts,
                to_raw_texts=to_raw_texts,
            )
        )

    return tuple(parsed_moves)


def expect_string_tuple(
    value: dict[str, Any],
    key: str,
    move_index: int,
) -> tuple[str, ...]:
    raw = value.get(key)

    assert isinstance(raw, list), (
        f"srcMove results moves[{move_index}].{key} must be a list."
    )

    for item_index, item in enumerate(raw):
        assert isinstance(item, str), (
            f"srcMove results moves[{move_index}].{key}[{item_index}] must be a string."
        )

    return tuple(raw)


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


def parse_xml_move_reference_list(value: str | None) -> tuple[str, ...]:
    return split_srcmove_path_list(value)


def extract_raw_text(element: ET.Element) -> str:
    return "".join(element.itertext())


def validate_single_srcmove_result_move(
    *,
    move: SrcMoveResultMove,
    xml_regions: dict[str, XmlMoveRegion],
) -> None:
    for xpath in move.from_xpaths:
        assert xpath in xml_regions, (
            f"results.json move {move.move_id!r} from_xpath does not exist in XML: "
            f"{xpath!r}."
        )

        region = xml_regions[xpath]

        assert region.move_id == move.move_id, (
            f"results.json move {move.move_id!r} references from_xpath {xpath!r}, "
            f"but XML node has mv:id={region.move_id!r}."
        )

        assert region.tag == "diff:delete", (
            f"results.json move {move.move_id!r} from_xpath {xpath!r} points to "
            f"{region.tag!r}; expected 'diff:delete'."
        )

        assert set(region.to_paths) == set(move.to_xpaths), (
            f"XML diff:delete node {xpath!r} has mv:to paths that do not match "
            f"results.json move {move.move_id!r}. "
            f"XML mv:to={sorted(region.to_paths)}. "
            f"results to_xpaths={sorted(move.to_xpaths)}."
        )

    for xpath in move.to_xpaths:
        assert xpath in xml_regions, (
            f"results.json move {move.move_id!r} to_xpath does not exist in XML: "
            f"{xpath!r}."
        )

        region = xml_regions[xpath]

        assert region.move_id == move.move_id, (
            f"results.json move {move.move_id!r} references to_xpath {xpath!r}, "
            f"but XML node has mv:id={region.move_id!r}."
        )

        assert region.tag == "diff:insert", (
            f"results.json move {move.move_id!r} to_xpath {xpath!r} points to "
            f"{region.tag!r}; expected 'diff:insert'."
        )

        assert set(region.from_paths) == set(move.from_xpaths), (
            f"XML diff:insert node {xpath!r} has mv:from paths that do not match "
            f"results.json move {move.move_id!r}. "
            f"XML mv:from={sorted(region.from_paths)}. "
            f"results from_xpaths={sorted(move.from_xpaths)}."
        )

    for xpath, expected_raw_text in zip(move.from_xpaths, move.from_raw_texts):
        actual_raw_text = xml_regions[xpath].raw_text

        assert actual_raw_text == expected_raw_text, (
            f"Raw text mismatch for move {move.move_id!r} from_xpath {xpath!r}. "
            f"XML raw text={actual_raw_text!r}. "
            f"results.json raw text={expected_raw_text!r}."
        )

    for xpath, expected_raw_text in zip(move.to_xpaths, move.to_raw_texts):
        actual_raw_text = xml_regions[xpath].raw_text

        assert actual_raw_text == expected_raw_text, (
            f"Raw text mismatch for move {move.move_id!r} to_xpath {xpath!r}. "
            f"XML raw text={actual_raw_text!r}. "
            f"results.json raw text={expected_raw_text!r}."
        )


def collect_tree_move_nodes(
    visualized_files: tuple[VisualizedFile, ...],
    *,
    filename_to_unit_index: dict[str, int],
) -> dict[str, TreeMoveNode]:
    moves: dict[str, TreeMoveNode] = {}

    for visualized_file in visualized_files:
        assert visualized_file.tree is not None, (
            f"Missing tree for unit {visualized_file.revision_file.unit_id} "
            f"({visualized_file.revision_file.filename})."
        )

        collect_tree_move_nodes_from_node(
            visualized_file.tree,
            moves,
            filename_to_unit_index=filename_to_unit_index,
        )

    return moves


def collect_tree_move_nodes_from_node(
    node: dict[str, object],
    moves: dict[str, TreeMoveNode],
    *,
    filename_to_unit_index: dict[str, int],
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

        from_paths = move.get("from_paths")
        to_paths = move.get("to_paths")

        assert isinstance(from_paths, list), (
            f"Tree node at {path} has invalid move.from_paths."
        )
        assert isinstance(to_paths, list), (
            f"Tree node at {path} has invalid move.to_paths."
        )

        for from_path in from_paths:
            assert isinstance(from_path, str), (
                f"Tree node at {path} has non-string move.from_paths item."
            )

        for to_path in to_paths:
            assert isinstance(to_path, str), (
                f"Tree node at {path} has non-string move.to_paths item."
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
            from_paths=normalize_srcmove_xpath_tuple(
                tuple(from_paths),
                filename_to_unit_index=filename_to_unit_index,
            ),
            to_paths=normalize_srcmove_xpath_tuple(
                tuple(to_paths),
                filename_to_unit_index=filename_to_unit_index,
            ),
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
        collect_tree_move_nodes_from_node(
            child,
            moves,
            filename_to_unit_index=filename_to_unit_index,
        )


def assert_move_groups_match(
    xml_regions: dict[str, XmlMoveRegion],
    tree_moves: dict[str, TreeMoveNode],
) -> None:
    xml_groups: dict[str, set[str]] = {}
    tree_groups: dict[str, set[str]] = {}

    for path, region in xml_regions.items():
        xml_groups.setdefault(region.move_id, set()).add(path)

    for path, move in tree_moves.items():
        tree_groups.setdefault(move.move_id, set()).add(path)

    assert xml_groups == tree_groups, (
        "Move id groupings differ between moved srcdiff XML and tree payload. "
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


def validate_visualization_payload(payload: VisualizationPayload) -> None:
    payload_dict = payload.to_dict()

    assert isinstance(payload_dict["source_filename"], str)
    assert payload_dict["source_filename"]

    assert isinstance(payload_dict["moved_srcdiff_xml"], str)
    assert payload_dict["moved_srcdiff_xml"].strip()

    assert isinstance(payload_dict["move_results"], dict)

    assert isinstance(payload_dict["has_position_data"], bool)

    assert isinstance(payload_dict["unit_count"], int)
    assert payload_dict["unit_count"] == len(payload.files)

    assert isinstance(payload_dict["files"], list)
    assert len(payload_dict["files"]) == payload_dict["unit_count"]

    for file_index, file_payload in enumerate(payload_dict["files"]):
        assert isinstance(file_payload, dict), (
            f"files[{file_index}] must be a dictionary."
        )

        assert isinstance(file_payload.get("unit_id"), int), (
            f"files[{file_index}].unit_id must be an integer."
        )

        assert file_payload["unit_id"] == file_index + 1, (
            f"files[{file_index}].unit_id must be {file_index + 1}; "
            f"got {file_payload['unit_id']}."
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
    moved_srcdiff_xml: str,
    include_skipped_tags: bool,
) -> None:
    spans = build_xml_span_index(
        moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
    )

    assert spans, "XML span index is empty."

    for path, span in spans.items():
        assert path.startswith("/src:unit["), f"Invalid XML span path: {path!r}."
        assert (span.start_line, span.start_col) <= (span.end_line, span.end_col), (
            f"Invalid XML span ordering at {path}: {span}."
        )
