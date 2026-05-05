from __future__ import annotations

from dataclasses import asdict, dataclass
import xml.etree.ElementTree as ET

from .namespaces import DIFF_NS, MV_NS, POS_NS, SRC_NS, prefixed_name
from .srcmove_paths import split_srcmove_path_list

POS_START = f"{{{POS_NS}}}start"
POS_END = f"{{{POS_NS}}}end"
POS_TABS = f"{{{POS_NS}}}tabs"

MV_ID = f"{{{MV_NS}}}id"
MV_FROM = f"{{{MV_NS}}}from"
MV_TO = f"{{{MV_NS}}}to"

PLAIN_MOVE = "move"
PLAIN_TYPE = "type"
PLAIN_FORMAT = "format"


@dataclass(frozen=True)
class PositionAttributes:
    start: str
    end: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class MoveAttributes:
    id: str
    from_paths: tuple[str, ...]
    to_paths: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "from_paths": list(self.from_paths),
            "to_paths": list(self.to_paths),
        }


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
class SrcDiffAttributes:
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


def parse_srcdiff_attributes(element: ET.Element) -> SrcDiffAttributes:
    assert_known_attributes(element)

    return SrcDiffAttributes(
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


def parse_move_attributes(element: ET.Element) -> MoveAttributes | None:
    namespaced_move_id = element.attrib.get(MV_ID)
    plain_move_id = element.attrib.get(PLAIN_MOVE)
    move_id = namespaced_move_id or plain_move_id
    from_value = element.attrib.get(MV_FROM)
    to_value = element.attrib.get(MV_TO)

    if (
        namespaced_move_id is None
        and plain_move_id is None
        and from_value is None
        and to_value is None
    ):
        return None

    assert move_id is not None, (
        f"Found mv:from/mv:to without mv:id on {prefixed_name(element.tag)}."
    )
    assert move_id, f"Empty mv:id on {prefixed_name(element.tag)}."

    from_paths = parse_move_path_list(from_value)
    to_paths = parse_move_path_list(to_value)

    return MoveAttributes(
        id=move_id,
        from_paths=from_paths,
        to_paths=to_paths,
    )


def parse_move_path_list(value: str | None) -> tuple[str, ...]:
    if value is None:
        return ()

    paths = split_srcmove_path_list(value)

    assert paths, f"Empty srcMove path list: {value!r}."

    for path in paths:
        assert path.startswith("/src:unit["), (
            f"srcMove path must start with /src:unit[: {path!r}."
        )

    return paths


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


def assert_known_attributes(element: ET.Element) -> None:
    allowed_attributes = set(KNOWN_COMMON_ATTRIBUTES)

    if element.tag == f"{{{SRC_NS}}}unit":
        allowed_attributes |= KNOWN_UNIT_ATTRIBUTES

    if element.tag.startswith(f"{{{DIFF_NS}}}"):
        allowed_attributes |= KNOWN_DIFF_ATTRIBUTES

    unknown_attributes = set(element.attrib) - allowed_attributes

    assert not unknown_attributes, (
        f"Unknown attributes on {prefixed_name(element.tag)}: "
        f"{[prefixed_name(attribute) for attribute in sorted(unknown_attributes)]}. "
        "Add them to srcvisual/core/srcdiff_attributes.py."
    )
