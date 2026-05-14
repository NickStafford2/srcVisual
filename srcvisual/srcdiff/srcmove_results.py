from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any
import xml.etree.ElementTree as ET

from ._srcmove_paths import split_srcmove_path_list
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


def parse_xml_move_reference_list(value: str | None) -> tuple[str, ...]:
    return split_srcmove_path_list(value)
