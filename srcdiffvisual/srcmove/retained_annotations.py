"""Reconstruct atomic annotations from admitted results without a detector run."""
from lxml import etree
from srcmove_runtime.results_schema import resolve_locator

from srcdiffvisual.srcmove.attributes import MV_ID, MV_FROM, MV_TO
from srcdiffvisual.srcmove.srcmove_results import validate_producer_results
from srcdiffvisual.srcmove.validate_results import validate_srcmove_results_match_xml


def annotate_retained_results(srcdiff_xml: str, results: dict) -> str:
    validate_producer_results(results)
    _root = etree.fromstring(
        srcdiff_xml.encode(), etree.XMLParser(resolve_entities=False, no_network=True)
    )
    from srcmove_runtime.results_xml import validate_sequences
    validate_sequences(srcdiff_xml.encode(), etree.ElementTree(_root), results, resolve_locator)
    _namespaces = results["xpath_context"]["namespaces"]
    _assigned = set()
    for _group in results["atomic_move_groups"]:
        for _side, _other, _direction in (
            ("original", "modified", MV_TO), ("modified", "original", MV_FROM)
        ):
            _partners = " | ".join(_endpoint["xpath"] for _endpoint in _group[_other])
            for _endpoint in _group[_side]:
                _element = resolve_locator(_root, _endpoint["xpath"], _namespaces)
                if _element in _assigned or MV_ID in _element.attrib:
                    raise ValueError(f"Retained moves overlap at {_endpoint['xpath']}")
                if "".join(_element.itertext()) != _endpoint["raw_text"]:
                    raise ValueError(f"Retained move text differs at {_endpoint['xpath']}")
                _assigned.add(_element)
                _element.set(MV_ID, _group["id"])
                _element.set(_direction, _partners)
    _xml = etree.tostring(_root, encoding="unicode")
    validate_srcmove_results_match_xml(
        moved_srcdiff_xml=_xml, move_results=results, include_skipped_tags=True,
        allow_additional_xml_moves=True,
    )
    return _xml
