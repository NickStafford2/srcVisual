from __future__ import annotations

from types import SimpleNamespace

from srcvisual.core.validation import is_payload_validation_enabled
from srcvisual.files.models import RevisionFile, VisualizedFile
import srcvisual.workflow.payload as payload_module


def test_payload_validation_enabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv("SRCVISUAL_PAYLOAD_VALIDATION", raising=False)

    assert is_payload_validation_enabled() is True


def test_build_visualization_payload_skips_expensive_validation_when_disabled(
    monkeypatch,
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
        lambda *args, **kwargs: ({1: {"path": "/src:unit[1]"}}, False),
    )
    monkeypatch.setattr(
        payload_module,
        "build_visualized_files",
        lambda **kwargs: visualized_files,
    )
    monkeypatch.setattr(
        payload_module,
        "prune_visualized_files",
        lambda files, level: files,
    )
    monkeypatch.setattr(
        payload_module,
        "prune_move_results",
        lambda **kwargs: {"move_count": 0, "moves": []},
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError("expensive validation should be skipped")

    monkeypatch.setattr(payload_module, "validate_xml_span_index", fail_if_called)
    monkeypatch.setattr(payload_module, "validate_moved_srcdiff_and_tree", fail_if_called)
    monkeypatch.setattr(payload_module, "validate_visualization_payload", fail_if_called)

    result = payload_module.build_visualization_payload(
        filename="example.move.diff.xml",
        payload=b"<unit />",
        include_skipped_tags=True,
        pruning_level="none",
    )

    assert result.source_filename == "example.move.diff.xml"
    assert result.move_results == {"move_count": 0, "moves": []}
    assert result.files == visualized_files
