"""Reconstruct move annotations from retained results without running a detector."""
import re
import xml.etree.ElementTree as ET

from srcdiffvisual.core.namespaces import SRC_NS, DIFF_NS, MV_NS, POS_NS
from srcdiffvisual.core.units import get_srcdiff_file_unit_elements
from srcdiffvisual.srcmove.attributes import MV_ID, MV_FROM, MV_TO
from srcdiffvisual.srcmove.move_regions import extract_raw_text
from srcdiffvisual.srcmove.srcmove_results import build_filename_to_unit_index, parse_srcmove_result_moves, validate_producer_results
from srcdiffvisual.srcmove.validate_results import validate_srcmove_results_match_xml


def annotate_retained_results(srcdiff_xml: str, results: dict) -> str:
    _root = ET.fromstring(srcdiff_xml)
    _units = get_srcdiff_file_unit_elements(_root)
    validate_producer_results(results)
    _moves = parse_srcmove_result_moves(results, filename_to_unit_index=build_filename_to_unit_index(srcdiff_xml))
    if results.get("move_count") != len(_moves):
        raise ValueError("Retained move count differs from the recorded move list.")
    _namespaces = {"src": SRC_NS, "diff": DIFF_NS, "mv": MV_NS, "pos": POS_NS}
    _assigned = set()
    for _move in _moves:
        for _paths, _texts, _partners, _direction in (
            (_move.from_xpaths, _move.from_raw_texts, _move.to_xpaths, MV_TO),
            (_move.to_xpaths, _move.to_raw_texts, _move.from_xpaths, MV_FROM),
        ):
            for _path, _text in zip(_paths, _texts, strict=True):
                _match = re.fullmatch(r"/src:unit\[(\d+)\](/.*)?", _path)
                if _match is None or not 1 <= int(_match[1]) <= len(_units):
                    raise ValueError(f"Retained move path has no file unit: {_path}")
                _unit = _units[int(_match[1]) - 1]
                # Internal paths omit src prefixes after the file-unit step.
                _tail = re.sub(r"([/\[])([A-Za-z_][\w.-]*)(?![\w.:-])", r"\1src:\2", _match[2] or "")
                try:
                    _elements = _unit.findall("." + _tail, _namespaces) if _tail else [_unit]
                except (SyntaxError, KeyError) as _error:
                    raise ValueError(f"Unsupported retained move path: {_path}") from _error
                if len(_elements) != 1:
                    raise ValueError(f"Retained move path is missing or ambiguous: {_path}")
                _element = _elements[0]
                if _element in _assigned or MV_ID in _element.attrib:
                    raise ValueError(f"Retained moves overlap at {_path}")
                if extract_raw_text(_element) != _text:
                    raise ValueError(f"Retained move text differs from srcDiff at {_path}")
                _assigned.add(_element)
                _element.set(MV_ID, _move.move_id)
                _element.set(_direction, " | ".join(_partners))
    for _prefix, _namespace in (("", SRC_NS), ("diff", DIFF_NS), ("mv", MV_NS), ("pos", POS_NS)):
        ET.register_namespace(_prefix, _namespace)
    _xml = ET.tostring(_root, encoding="unicode")
    # Producer paths can use name predicates while the viewer uses indices.
    validate_srcmove_results_match_xml(moved_srcdiff_xml=_xml, move_results=results, include_skipped_tags=True, allow_additional_xml_moves=True)
    return _xml
