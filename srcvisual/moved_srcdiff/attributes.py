from __future__ import annotations

from dataclasses import asdict, dataclass
import xml.etree.ElementTree as ET

from srcvisual.srcmove.attributes import (
    MV_FROM,
    MV_ID,
    MV_TO,
    PLAIN_FORMAT,
    PLAIN_MOVE,
    PLAIN_TYPE,
    MoveAttributes,
    parse_move_attributes,
)

from srcvisual.core.namespaces import DIFF_NS, POS_NS, SRC_NS, prefixed_name

POS_START = f"{{{POS_NS}}}start"
POS_END = f"{{{POS_NS}}}end"
POS_TABS = f"{{{POS_NS}}}tabs"


@dataclass(frozen=True)
class PositionAttributes:
    start: str
    end: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class UnitAttributes:
    filename: str | None = None
    language: str | None = None
    revision: str | None = None
    url: str | None = None
    hash: str | None = None
    timestamp: str | None = None

    def to_dict(self) -> dict[str, str | None]:
        return asdict(self)


@dataclass(frozen=True)
class DiffAttributes:
    revision: str | None = None
    type: str | None = None

    def to_dict(self) -> dict[str, str | None]:
        return asdict(self)


@dataclass(frozen=True)
class AllAttributes:
    position: PositionAttributes | None
    move: MoveAttributes | None
    unit: UnitAttributes | None
    diff: DiffAttributes | None

    def to_dict(self) -> dict[str, object]:
        return {
            "position": self.position.to_dict() if self.position else None,
            "move": self.move.to_dict() if self.move else None,
            "unit": self.unit.to_dict() if self.unit else None,
            "diff": self.diff.to_dict() if self.diff else None,
        }


def parse_srcdiff_attributes(element: ET.Element) -> AllAttributes:
    _assert_known_attributes(element)

    return AllAttributes(
        position=parse_position_attributes(element),
        move=parse_move_attributes(element),
        unit=parse_unit_attributes(element),
        diff=parse_diff_attributes(element),
    )


def parse_position_attributes(element: ET.Element) -> PositionAttributes | None:
    start = element.attrib.get(POS_START)
    end = element.attrib.get(POS_END)

    if start is None and end is None:
        return None

    assert start is not None, f"Missing pos:start on {prefixed_name(element.tag)}."
    assert end is not None, f"Missing pos:end on {prefixed_name(element.tag)}."

    return PositionAttributes(start=start, end=end)


def parse_unit_attributes(element: ET.Element) -> UnitAttributes | None:
    if element.tag != f"{{{SRC_NS}}}unit":
        return None

    return UnitAttributes(
        filename=element.attrib.get("filename"),
        language=element.attrib.get("language"),
        revision=element.attrib.get("revision"),
        url=element.attrib.get("url"),
        hash=element.attrib.get("hash"),
        timestamp=element.attrib.get("timestamp"),
    )


def parse_diff_attributes(element: ET.Element) -> DiffAttributes | None:
    if not element.tag.startswith(f"{{{DIFF_NS}}}"):
        return None

    return DiffAttributes(
        revision=element.attrib.get("revision"),
        type=element.attrib.get("type"),
    )


KNOWN_COMMON_ATTRIBUTES = {
    POS_START,
    POS_END,
    POS_TABS,
    MV_ID,
    MV_FROM,
    MV_TO,
    PLAIN_MOVE,
    PLAIN_TYPE,
    PLAIN_FORMAT,
}

KNOWN_UNIT_ATTRIBUTES = {
    "filename",
    "language",
    "revision",
    "url",
    "hash",
    "timestamp",
}

KNOWN_DIFF_ATTRIBUTES = {
    "revision",
    "type",
}


def _assert_known_attributes(element: ET.Element) -> None:
    allowed_attributes = set(KNOWN_COMMON_ATTRIBUTES)

    if element.tag == f"{{{SRC_NS}}}unit":
        allowed_attributes |= KNOWN_UNIT_ATTRIBUTES

    if element.tag.startswith(f"{{{DIFF_NS}}}"):
        allowed_attributes |= KNOWN_DIFF_ATTRIBUTES

    unknown_attributes = set(element.attrib) - allowed_attributes

    assert not unknown_attributes, (
        f"Unknown attributes on {prefixed_name(element.tag)}: "
        f"{[prefixed_name(attribute) for attribute in sorted(unknown_attributes)]}. "
        "Add them to srcvisual/srcdiff/attributes.py."
    )
