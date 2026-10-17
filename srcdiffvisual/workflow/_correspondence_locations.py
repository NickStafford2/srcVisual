"""Resolve diagnostics before annotation changes XML paths; never match by text search."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from srcdiffvisual.core.namespaces import prefixed_name
from srcdiffvisual.core.units import get_srcdiff_file_unit_elements
from srcdiffvisual.workflow._source_renderer import _render_unit_sources


def add_correspondence_locations(
    original_xml: str, moved_xml: str, results: dict[str, Any]
) -> None:
    _diagnostics = results.get("diagnostics")
    if not isinstance(_diagnostics, dict) or _diagnostics.get("schema_version") != 5:
        return
    _units = get_srcdiff_file_unit_elements(ET.fromstring(original_xml))
    _final_units = get_srcdiff_file_unit_elements(ET.fromstring(moved_xml))
    from lxml import etree
    from srcmove_runtime.results_schema import resolve_locator
    _native = etree.fromstring(original_xml.encode(), etree.XMLParser(resolve_entities=False, no_network=True))
    _native_units = get_srcdiff_file_unit_elements(_native)
    _native_paths = {}

    def _native_walk(_element, _path):
        _native_paths[_element] = _path
        _counts = {}
        for _child in _element:
            if not isinstance(_child.tag, str):
                continue
            _name = prefixed_name(_child.tag)
            _counts[_name] = _counts.get(_name, 0) + 1
            _native_walk(_child, f"{_path}/{_name}[{_counts[_name]}]")

    for _number, _unit in enumerate(_native_units, 1):
        _native_walk(_unit, f"/src:unit[{_number}]")
    _paths: dict[ET.Element, tuple[int, str]] = {}
    _rendered = {}
    _unchanged = {}

    def _walk(element: ET.Element, unit_id: int, path: str) -> None:
        _paths[element] = (unit_id, path)
        _counts: dict[str, int] = {}
        for _child in element:
            _name = prefixed_name(_child.tag)
            _counts[_name] = _counts.get(_name, 0) + 1
            _walk(_child, unit_id, f"{path}/{_name}[{_counts[_name]}]")

    for _unit_id, _unit in enumerate(_units, 1):
        _path = f"/src:unit[{_unit_id}]"
        _walk(_unit, _unit_id, _path)
        _before = _render_unit_sources(
            unit_element=_unit, path=_path, include_skipped_tags=True
        )
        _rendered[_unit_id] = _before
        if _unit_id <= len(_final_units):
            _after = _render_unit_sources(
                unit_element=_final_units[_unit_id - 1],
                path=_path,
                include_skipped_tags=True,
            )
            for _revision in (0, 1):
                _unchanged[_unit_id, _revision] = getattr(
                    _before, f"revision_{_revision}_source_code"
                ) == getattr(_after, f"revision_{_revision}_source_code")

    _selected = {(_side, _endpoint["candidate_id"]): _endpoint
                 for _group in results["atomic_move_groups"]
                 for _side in ("original", "modified")
                 for _endpoint in _group[_side]}
    _by_path = {_value[1]: _value for _value in _paths.values()}
    _locations = {}
    for _candidate in _diagnostics["candidates"]:
        _location: dict[str, Any] = {
            "span": None,
            "unit_id": None,
            "reason": "Candidate XPath is unsupported or does not resolve uniquely.",
        }
        _revision_name = _candidate["revision"]
        _endpoint = (_selected[_revision_name, _candidate["candidate_id"]]
                     if _candidate["selected_group_id"] is not None else _candidate["endpoint"])
        try:
            _match = resolve_locator(_native, _endpoint["xpath"], results["xpath_context"]["namespaces"])
            _path = _native_paths.get(_match)
        except ValueError:
            _path = None
        if _path in _by_path:
            _unit_id, _path = _by_path[_path]
            _revision = 0 if _revision_name == "original" else 1
            _source = _rendered[_unit_id]
            _span = getattr(_source, f"revision_{_revision}_spans_by_path").get(_path)
            _text = getattr(_source, f"revision_{_revision}_source_code")
            _location["reason"] = (
                "Candidate text or final source coordinates could not be verified."
            )
            if _span and _unchanged.get((_unit_id, _revision)):
                _lines = _text.splitlines(keepends=True)
                _start = (
                    sum(map(len, _lines[: _span.start_line - 1])) + _span.start_col - 1
                )
                _end = sum(map(len, _lines[: _span.end_line - 1])) + _span.end_col
                if _text[_start:_end] == _endpoint["raw_text"]:
                    _location = {
                        "unit_id": _unit_id,
                        "span": _span.to_dict(),
                        "reason": None,
                    }
        _locations[str(_candidate["candidate_id"])] = _location
    results["visualization_candidate_locations"] = _locations
