from __future__ import annotations

from pathlib import Path

import pytest

from srcvisual.app import create_app

EXAMPLES_DIR = Path(__file__).resolve().parents[1] / "examples"
EXAMPLE_PATHS = sorted(
    path
    for path in EXAMPLES_DIR.iterdir()
    if path.is_file() and path.suffix in {".xml", ".srcdiff"}
) if EXAMPLES_DIR.is_dir() else []


@pytest.mark.skipif(
    not EXAMPLE_PATHS,
    reason="No example files found in srcVisual/examples.",
)
@pytest.mark.parametrize("example_path", EXAMPLE_PATHS, ids=lambda path: path.name)
def test_visualize_endpoint_accepts_example_file(example_path: Path) -> None:
    client = create_app().test_client()

    response = client.post(
        "/api/visualize",
        data={
            "srcdiff_xml": example_path.read_text(encoding="utf-8"),
            "include_skipped_tags": "false",
        },
    )

    if response.status_code != 200:
        payload = response.get_json(silent=True)
        error_message = payload["error"] if isinstance(payload, dict) and "error" in payload else response.get_data(as_text=True)
        pytest.fail(f"{example_path.name} failed with status {response.status_code}: {error_message}")
