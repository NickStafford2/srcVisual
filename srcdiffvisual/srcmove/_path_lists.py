from __future__ import annotations


def split_srcmove_path_list(value: str | None) -> tuple[str, ...]:
    if value is None:
        return ()

    parts: list[str] = []
    current: list[str] = []
    quote: str | None = None

    for char in value:
        if quote is not None:
            current.append(char)
            if char == quote:
                quote = None
            continue

        if char in {"'", '"'}:
            quote = char
            current.append(char)
            continue

        if char == "|":
            part = "".join(current).strip()
            if part:
                parts.append(part)
            current = []
            continue

        current.append(char)

    tail = "".join(current).strip()
    if tail:
        parts.append(tail)

    return tuple(parts)
