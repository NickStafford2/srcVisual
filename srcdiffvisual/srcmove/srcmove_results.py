from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any
import xml.etree.ElementTree as ET

from srcdiffvisual.srcmove._path_lists import split_srcmove_path_list
from srcdiffvisual.core.units import get_srcdiff_file_unit_elements


FILENAME_UNIT_PATTERN = re.compile(
    r"^/src:unit\[@filename=(?P<quote>['\"])(?P<filename>.*?)(?P=quote)\](?P<rest>/.*)?$"
)


@dataclass(frozen=True)
class SrcMoveResultMove:
    move_id: str
    content_relationship: str | None
    from_xpaths: tuple[str, ...]
    to_xpaths: tuple[str, ...]
    from_raw_texts: tuple[str, ...]
    to_raw_texts: tuple[str, ...]


CONTENT_RELATIONSHIPS = {"type1", "type2c", "type3"}
LEGACY_CLASSIFICATION_FIELDS = {
    "match_kind",
    "match_kinds",
    "by_match_type",
    "expected_match_kind",
    "reviewed_expected_match_kind",
    "observed_match_kind",
    "reviewed_match_kind",
    "_oracle_observed_match_kind",
}


def validate_classification_fields(value: Any) -> None:
    """Reject superseded reporting fields, including nested oracle/review payloads."""
    if isinstance(value, dict):
        for _key, _item in value.items():
            if _key in LEGACY_CLASSIFICATION_FIELDS:
                raise ValueError(
                    f"Unsupported legacy classification field {_key!r}. "
                    "Preserve retained evidence and regenerate with current srcMove tools."
                )
            if (
                _key
                in {
                    "content_relationship",
                    "expected_content_relationship",
                    "reviewed_expected_content_relationship",
                    "observed_content_relationship",
                    "reviewed_content_relationship",
                    "_oracle_observed_content_relationship",
                }
                and _item is not None
                and (
                    not isinstance(_item, str)
                    or _item not in CONTENT_RELATIONSHIPS | {"type2b"}
                )
            ):
                raise ValueError(
                    f"Unsupported content relationship: {_item!r}; regenerate with current tools."
                )
            if _key in {"content_relationships", "by_content_relationship"}:
                if (
                    not isinstance(_item, dict)
                    or not set(_item) <= CONTENT_RELATIONSHIPS
                ):
                    raise ValueError(
                        "Unsupported detector content_relationships; regenerate with current tools."
                    )
            validate_classification_fields(_item)
    elif isinstance(value, list):
        for _item in value:
            validate_classification_fields(_item)


def validate_producer_results(
    move_results: dict[str, Any], *, allow_visualization_metadata: bool = False
) -> None:
    from srcmove_runtime.results_schema import validate_results

    if not isinstance(move_results, dict):
        raise ValueError("srcMove results must contain an object.")
    validate_results({_key: _value for _key, _value in move_results.items()
                      if not allow_visualization_metadata or _key != "visualization_candidate_locations"})


class _LocatorUnits(dict[str, int]):
    """Filename index plus native XML identity for exact locator remapping."""

    tree: Any
    xml: bytes
    paths: dict[Any, str]
    namespaces: dict[str, str] | None = None
    xml_namespaces: dict[str, str]
    ambiguous_prefixes: set[str]
    internal_paths: set[str]


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

    from lxml import etree

    _index = _LocatorUnits(filename_to_unit_index)
    _index.xml = moved_srcdiff_xml.encode()
    _index.tree = etree.fromstring(
        moved_srcdiff_xml.encode(), etree.XMLParser(resolve_entities=False, no_network=True)
    )
    _index.xml_namespaces = {"src": "http://www.srcML.org/srcML/src", "diff": "http://www.srcML.org/srcDiff", "mv": "http://www.srcML.org/srcMove"}
    _index.ambiguous_prefixes = set()
    for _node in _index.tree.iter():
        for _prefix, _uri in _node.nsmap.items():
            if _prefix:
                if _prefix in _index.xml_namespaces and _index.xml_namespaces[_prefix] != _uri:
                    _index.ambiguous_prefixes.add(_prefix)
                else:
                    _index.xml_namespaces[_prefix] = _uri
    _index.paths = {}
    _native_units = get_srcdiff_file_unit_elements(_index.tree)

    def _walk(_node: Any, _path: str) -> None:
        _index.paths[_node] = _path
        _counts: dict[str, int] = {}
        from srcdiffvisual.core.namespaces import prefixed_name
        for _child in _node:
            if not isinstance(_child.tag, str):
                continue
            _name = prefixed_name(_child.tag)
            _counts[_name] = _counts.get(_name, 0) + 1
            _walk(_child, f"{_path}/{_name}[{_counts[_name]}]")

    for _number, _unit in enumerate(_native_units, 1):
        _walk(_unit, f"/src:unit[{_number}]")
    _index.internal_paths = set(_index.paths.values())
    return _index


def normalize_srcmove_xpath(
    xpath: str,
    *,
    filename_to_unit_index: dict[str, int],
    allow_internal: bool = False,
) -> str:
    if isinstance(filename_to_unit_index, _LocatorUnits):
        from srcmove_runtime.results_schema import resolve_locator
        if allow_internal and xpath in filename_to_unit_index.internal_paths:
            return xpath
        if filename_to_unit_index.namespaces is not None:
            _namespaces = filename_to_unit_index.namespaces
        else:
            _namespaces = filename_to_unit_index.xml_namespaces
            _used = set(re.findall(r"([A-Za-z_][\w.-]*):[A-Za-z_]", re.sub(r"'[^']*'|\"[^\"]*\"", "", xpath)))
            if _used & filename_to_unit_index.ambiguous_prefixes:
                raise ValueError("Unsupported ambiguous XML locator namespace")
        _node = resolve_locator(filename_to_unit_index.tree, xpath, _namespaces)
        if _node not in filename_to_unit_index.paths:
            raise ValueError(f"Locator does not identify a displayed file endpoint: {xpath}")
        return filename_to_unit_index.paths[_node]
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
    allow_internal: bool = False,
) -> tuple[str, ...]:
    return tuple(
        normalize_srcmove_xpath(
            xpath,
            filename_to_unit_index=filename_to_unit_index,
            allow_internal=allow_internal,
        )
        for xpath in xpaths
    )


def parse_srcmove_result_moves(
    move_results: dict[str, Any],
    *,
    filename_to_unit_index: dict[str, int],
    allow_visualization_metadata: bool = False,
) -> tuple[SrcMoveResultMove, ...]:
    assert isinstance(move_results, dict), (
        f"srcMove results must be a dict; got {type(move_results).__name__}."
    )

    validate_classification_fields(move_results)
    if isinstance(filename_to_unit_index, _LocatorUnits) and "producer_metadata" in move_results:
        _context = move_results["producer_metadata"].get("xpath_context")
        if _context is not None:
            filename_to_unit_index.namespaces = _context["namespaces"]
    if "results_schema_version" in move_results:
        from srcmove_runtime.results_schema import atomic_moves
        validate_producer_results(move_results, allow_visualization_metadata=allow_visualization_metadata)
        if isinstance(filename_to_unit_index, _LocatorUnits):
            from lxml import etree
            from srcmove_runtime.results_schema import resolve_locator
            _namespaces = move_results["xpath_context"]["namespaces"]
            from srcmove_runtime.results_xml import validate_sequences
            validate_sequences(filename_to_unit_index.xml, etree.ElementTree(filename_to_unit_index.tree), move_results, resolve_locator, check_parent_ids=False)
            for _group in move_results["atomic_move_groups"]:
                for _side, _revision in (("original", 0), ("modified", 1)):
                    for _endpoint in _group[_side]:
                        _node = resolve_locator(filename_to_unit_index.tree, _endpoint["xpath"], _namespaces)
                        if _endpoint["construct"] is not None:
                            _local = etree.QName(_node).localname
                            if _endpoint["construct"].split(":")[-1] != _local:
                                raise ValueError("Endpoint construct differs from native XML")
                        _unit = _node
                        while _unit is not None and etree.QName(_unit).localname != "unit":
                            _unit = _unit.getparent()
                        _filename = _unit.get("filename") if _unit is not None else None
                        if _filename is not None and "|" in _filename:
                            _parts = _filename.split("|", 1)
                            _filename = _parts[_revision] or None
                        if _endpoint["revision_file"] is not None and _endpoint["revision_file"] != _filename:
                            raise ValueError("Endpoint revision file differs from native XML")
        moves_value = atomic_moves(move_results)
        if isinstance(filename_to_unit_index, _LocatorUnits):
            filename_to_unit_index.namespaces = move_results["xpath_context"]["namespaces"]
    else:
        moves_value = move_results.get("moves")
    assert isinstance(moves_value, list), "srcMove results must contain moves list."

    parsed_moves: list[SrcMoveResultMove] = []
    seen_move_ids: set[str] = set()

    for index, value in enumerate(moves_value):
        assert isinstance(value, dict), (
            f"srcMove results moves[{index}] must be a dict."
        )

        if (
            "content_relationship" in value
            and value["content_relationship"] not in CONTENT_RELATIONSHIPS
        ):
            raise ValueError(
                "Reported moves require content_relationship type1, type2c, or type3; regenerate results."
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
            allow_internal="results_schema_version" not in move_results,
        )
        to_xpaths = normalize_srcmove_xpath_tuple(
            expect_string_tuple(value, "to_xpaths", index),
            filename_to_unit_index=filename_to_unit_index,
            allow_internal="results_schema_version" not in move_results,
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
                content_relationship=value.get("content_relationship"),
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


def parse_xml_move_reference_list(value: str | None) -> tuple[str, ...]:
    return split_srcmove_path_list(value)
