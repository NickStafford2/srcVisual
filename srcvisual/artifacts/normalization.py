from __future__ import annotations

import re

from srcvisual.artifacts.models import ArtifactProvenance

_ROOT_UNIT_PATTERN = re.compile(r"<unit\b[^>]*>", re.DOTALL)
_URL_PATTERN = re.compile(r"\burl=(?P<quote>['\"])(?P<value>.*?)(?P=quote)")


def normalize_annotated_xml(
    annotated_xml: str,
    *,
    provenance: ArtifactProvenance,
) -> str:
    if provenance.origin != "history":
        return annotated_xml

    _root_match = _ROOT_UNIT_PATTERN.search(annotated_xml)
    if _root_match is None:
        raise ValueError("Annotated XML has no root srcML unit element.")

    _root_tag = _root_match.group(0)
    _normalized_root = _URL_PATTERN.sub(
        lambda _match: (
            f"url={_match.group('quote')}revision-0|revision-1{_match.group('quote')}"
        ),
        _root_tag,
        count=1,
    )
    if _normalized_root == _root_tag:
        return annotated_xml

    return (
        annotated_xml[: _root_match.start()]
        + _normalized_root
        + annotated_xml[_root_match.end() :]
    )
