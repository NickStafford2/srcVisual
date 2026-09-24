from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from srcvisual.artifacts.store import read_artifact
from srcvisual.core.validation import is_payload_validation_enabled
from srcvisual.files.models import RevisionFile, VisualizedFile
import srcvisual.workflow.payload as payload_module


def test_payload_validation_enabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv("SRCVISUAL_PAYLOAD_VALIDATION", raising=False)

    assert is_payload_validation_enabled() is True


def test_build_visualization_artifact_skips_expensive_validation_when_disabled(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("SRCVISUAL_PAYLOAD_VALIDATION", "false")

    revision_file = RevisionFile(
        unit_id=1,
        filename="example.cpp",
        revision_0_filename="before/example.cpp",
        revision_1_filename="after/example.cpp",
        language="C++",
        revision_0_source_code="int before_value;\n",
        revision_1_source_code="int after_value;\n",
    )
    visualized_files = (VisualizedFile(revision_file=revision_file, tree=None),)

    monkeypatch.setattr(
        payload_module,
        "extract_revision_files",
        lambda **kwargs: SimpleNamespace(
            files=(revision_file,),
            revision_0_input="revision-0",
            revision_1_input="revision-1",
        ),
    )
    monkeypatch.setattr(
        payload_module,
        "build_moved_srcdiff_xml",
        lambda **kwargs: ("<unit />", {"move_count": 0, "moves": []}, False),
    )
    monkeypatch.setattr(
        payload_module,
        "is_strict_srcmove_validation_enabled",
        lambda: False,
    )
    monkeypatch.setattr(
        payload_module,
        "build_tree_index",
        lambda *args, **kwargs: (
            {
                1: {
                    "path": "/src:unit[1]",
                    "kind": "plain",
                    "children": [],
                }
            },
            False,
        ),
    )
    monkeypatch.setattr(
        payload_module,
        "build_visualized_files",
        lambda **kwargs: visualized_files,
    )

    def _render_revision_files(**kwargs):
        return (
            SimpleNamespace(
                revision_file=revision_file,
                revision_0_spans_by_path={},
                revision_1_spans_by_path={},
            ),
        )

    monkeypatch.setattr(
        payload_module,
        "render_revision_files",
        _render_revision_files,
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError("expensive validation should be skipped")

    monkeypatch.setattr(payload_module, "validate_xml_span_index", fail_if_called)
    monkeypatch.setattr(
        payload_module, "validate_moved_srcdiff_and_tree", fail_if_called
    )
    monkeypatch.setattr(
        payload_module, "validate_visualization_payload", fail_if_called
    )

    published = payload_module.build_visualization_artifact(
        filename="example.move.diff.xml",
        payload=b"<unit />",
        artifact_root=tmp_path,
    )
    result = read_artifact(
        artifact_root=tmp_path,
        artifact_id=published.artifact_id,
    ).payload

    assert result.source_filename == "example.move.diff.xml"
    assert result.move_results == {"move_count": 0, "moves": []}
    assert result.files == visualized_files
