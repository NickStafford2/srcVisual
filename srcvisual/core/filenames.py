from __future__ import annotations

from pathlib import Path


def sanitize_filename(filename: str) -> str:
    candidate = Path(filename).name

    if candidate:
        return candidate

    return "uploaded.srcdiff.xml"
