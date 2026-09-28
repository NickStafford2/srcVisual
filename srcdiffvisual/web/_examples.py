from __future__ import annotations

from pathlib import Path

from flask import current_app

SUPPORTED_EXAMPLE_SUFFIXES = (".xml", ".srcdiff")


def list_example_filenames() -> list[str]:
    examples_dir = get_examples_dir()
    if not examples_dir.exists():
        return []

    return sorted(
        path.name
        for path in examples_dir.iterdir()
        if path.is_file() and path.suffix in SUPPORTED_EXAMPLE_SUFFIXES
    )


def read_example_file(filename: str) -> str:
    candidate = Path(filename).name
    if candidate != filename:
        raise ValueError("Example filename must not include directory separators.")

    if candidate not in list_example_filenames():
        raise ValueError(f"Example not found: {filename}")

    return (get_examples_dir() / candidate).read_text(encoding="utf-8")


def get_examples_dir() -> Path:
    configured_path = current_app.config.get("EXAMPLES_DIR")
    if not isinstance(configured_path, Path):
        raise ValueError("EXAMPLES_DIR application config is not set.")

    return configured_path
