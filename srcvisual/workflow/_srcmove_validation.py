from __future__ import annotations

from typing import Any

from srcvisual.srcdiff.move_regions import XmlMoveRegion, collect_xml_move_regions
from srcvisual.srcdiff.srcmove_results import (
    SrcMoveResultMove,
    build_filename_to_unit_index,
    parse_srcmove_result_moves,
)


def validate_srcmove_results_match_xml(
    *,
    moved_srcdiff_xml: str,
    move_results: dict[str, Any],
    include_skipped_tags: bool,
) -> None:
    _filename_to_unit_index = build_filename_to_unit_index(moved_srcdiff_xml)
    _result_moves = parse_srcmove_result_moves(
        move_results,
        filename_to_unit_index=_filename_to_unit_index,
    )
    _xml_regions = collect_xml_move_regions(
        moved_srcdiff_xml=moved_srcdiff_xml,
        include_skipped_tags=include_skipped_tags,
        filename_to_unit_index=_filename_to_unit_index,
    )

    assert move_results.get("move_count") == len(_result_moves), (
        "srcMove results move_count does not match moves length. "
        f"move_count={move_results.get('move_count')!r}, "
        f"moves length={len(_result_moves)}."
    )

    _result_move_ids = {_move.move_id for _move in _result_moves}
    _xml_move_ids = {_region.move_id for _region in _xml_regions.values()}

    assert _result_move_ids == _xml_move_ids, (
        "Move ids differ between results.json and moved XML. "
        f"Only in results.json: {sorted(_result_move_ids - _xml_move_ids)}. "
        f"Only in XML: {sorted(_xml_move_ids - _result_move_ids)}."
    )

    for _move in _result_moves:
        validate_single_srcmove_result_move(
            move=_move,
            xml_regions=_xml_regions,
        )

    _result_paths: set[str] = set()

    for _move in _result_moves:
        _result_paths.update(_move.from_xpaths)
        _result_paths.update(_move.to_xpaths)

    _xml_paths = set(_xml_regions)

    assert _result_paths == _xml_paths, (
        "Move region paths differ between results.json and moved XML. "
        f"Only in results.json: {sorted(_result_paths - _xml_paths)}. "
        f"Only in XML: {sorted(_xml_paths - _result_paths)}."
    )


def validate_single_srcmove_result_move(
    *,
    move: SrcMoveResultMove,
    xml_regions: dict[str, XmlMoveRegion],
) -> None:
    for _xpath in move.from_xpaths:
        assert _xpath in xml_regions, (
            f"results.json move {move.move_id!r} from_xpath does not exist in XML: "
            f"{_xpath!r}."
        )

        _region = xml_regions[_xpath]

        assert _region.move_id == move.move_id, (
            f"results.json move {move.move_id!r} references from_xpath {_xpath!r}, "
            f"but XML node has mv:id={_region.move_id!r}."
        )

        assert _region.tag == "diff:delete", (
            f"results.json move {move.move_id!r} from_xpath {_xpath!r} points to "
            f"{_region.tag!r}; expected 'diff:delete'."
        )

        assert set(_region.to_paths) == set(move.to_xpaths), (
            f"XML diff:delete node {_xpath!r} has mv:to paths that do not match "
            f"results.json move {move.move_id!r}. "
            f"XML mv:to={sorted(_region.to_paths)}. "
            f"results to_xpaths={sorted(move.to_xpaths)}."
        )

    for _xpath in move.to_xpaths:
        assert _xpath in xml_regions, (
            f"results.json move {move.move_id!r} to_xpath does not exist in XML: "
            f"{_xpath!r}."
        )

        _region = xml_regions[_xpath]

        assert _region.move_id == move.move_id, (
            f"results.json move {move.move_id!r} references to_xpath {_xpath!r}, "
            f"but XML node has mv:id={_region.move_id!r}."
        )

        assert _region.tag == "diff:insert", (
            f"results.json move {move.move_id!r} to_xpath {_xpath!r} points to "
            f"{_region.tag!r}; expected 'diff:insert'."
        )

        assert set(_region.from_paths) == set(move.from_xpaths), (
            f"XML diff:insert node {_xpath!r} has mv:from paths that do not match "
            f"results.json move {move.move_id!r}. "
            f"XML mv:from={sorted(_region.from_paths)}. "
            f"results from_xpaths={sorted(move.from_xpaths)}."
        )

    for _xpath, _expected_raw_text in zip(move.from_xpaths, move.from_raw_texts):
        _actual_raw_text = xml_regions[_xpath].raw_text

        assert _actual_raw_text == _expected_raw_text, (
            f"Raw text mismatch for move {move.move_id!r} from_xpath {_xpath!r}. "
            f"XML raw text={_actual_raw_text!r}. "
            f"results.json raw text={_expected_raw_text!r}."
        )

    for _xpath, _expected_raw_text in zip(move.to_xpaths, move.to_raw_texts):
        _actual_raw_text = xml_regions[_xpath].raw_text

        assert _actual_raw_text == _expected_raw_text, (
            f"Raw text mismatch for move {move.move_id!r} to_xpath {_xpath!r}. "
            f"XML raw text={_actual_raw_text!r}. "
            f"results.json raw text={_expected_raw_text!r}."
        )
