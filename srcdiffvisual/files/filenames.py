from __future__ import annotations

from pathlib import Path


def sanitize_filename(filename: str) -> str:
    candidate = Path(filename).name

    if candidate:
        return candidate

    return "uploaded.srcdiff.xml"


def normalize_visualized_filename(filename: str) -> str:
    if "|" not in filename:
        return filename

    left, right = filename.split("|", 1)
    normalized_left = Path(left).name if left else ""
    normalized_right = Path(right).name if right else ""
    return f"{normalized_left}|{normalized_right}"
