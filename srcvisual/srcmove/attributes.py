from __future__ import annotations

from dataclasses import dataclass
import xml.etree.ElementTree as ET

from srcvisual.core.namespaces import DIFF_NS, MV_NS, POS_NS, SRC_NS, prefixed_name
from srcvisual.srcmove._path_lists import split_srcmove_path_list

MV_ID = f"{{{MV_NS}}}id"
MV_FROM = f"{{{MV_NS}}}from"
MV_TO = f"{{{MV_NS}}}to"

PLAIN_MOVE = "move"
PLAIN_TYPE = "type"
PLAIN_FORMAT = "format"


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
