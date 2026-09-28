from __future__ import annotations

from pathlib import Path

from srcdiffvisual.workflow._srcdiff import build_moved_srcdiff_xml


def test_build_moved_srcdiff_xml_restores_positioned_xml_before_srcmove(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _input_path = tmp_path / "input.xml"
    _input_path.write_text("<unit />", encoding="utf-8")
    _positioned_path = tmp_path / "positioned.srcdiff.xml"
    _calls: list[object] = []

    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.has_srcmove_annotations",
        lambda _xml: False,
    )
    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.has_position_annotations",
        lambda _xml: False,
    )

    def _fake_run_srcdiff_with_positions(**_kwargs) -> Path:
        _calls.append("srcdiff")
        _positioned_path.write_text("generated positioned xml", encoding="utf-8")
        return _positioned_path

    def _fake_restore_original_metadata_on_path(
        *,
        original_srcdiff_xml: str,
        generated_path: Path,
    ) -> None:
        _calls.append(("restore", original_srcdiff_xml, generated_path.name))
        generated_path.write_text("restored positioned xml", encoding="utf-8")

    def _fake_run_srcmove(
        *,
        positioned_path: Path,
        tmpdir: Path,
        progress,
    ) -> tuple[str, dict[str, object]]:
        _calls.append(("srcmove", positioned_path.read_text(encoding="utf-8"), tmpdir))
        return "annotated xml", {"moves": []}

    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.run_srcdiff_with_positions",
        _fake_run_srcdiff_with_positions,
    )
    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.restore_original_metadata_on_path",
        _fake_restore_original_metadata_on_path,
    )
    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.run_srcmove", _fake_run_srcmove
    )

    _moved_xml, _move_results, _has_position_data = build_moved_srcdiff_xml(
        input_path=_input_path,
        revision_0_dir=tmp_path / "revision_0",
        revision_1_dir=tmp_path / "revision_1",
        revision_0_input=tmp_path / "revision_0.xml",
        revision_1_input=tmp_path / "revision_1.xml",
        tmpdir=tmp_path,
        include_skipped_tags=False,
    )

    assert _moved_xml == "annotated xml"
    assert _move_results == {"moves": []}
    assert _has_position_data is True
    assert _calls[0] == "srcdiff"
    assert _calls[1] == ("restore", "<unit />", "positioned.srcdiff.xml")
    assert _calls[2] == ("srcmove", "restored positioned xml", tmp_path)


def test_build_moved_srcdiff_xml_skips_restore_when_input_has_positions(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _input_path = tmp_path / "input.xml"
    _input_path.write_text("<unit />", encoding="utf-8")
    _calls: list[object] = []

    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.has_srcmove_annotations",
        lambda _xml: False,
    )
    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.has_position_annotations",
        lambda _xml: True,
    )

    def _fake_restore_original_metadata_on_path(**_kwargs) -> None:
        raise AssertionError("restore_original_metadata_on_path should not be called")

    def _fake_run_srcmove(
        *,
        positioned_path: Path,
        tmpdir: Path,
        progress,
    ) -> tuple[str, dict[str, object]]:
        _calls.append((positioned_path, tmpdir))
        return "annotated xml", {"moves": []}

    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.restore_original_metadata_on_path",
        _fake_restore_original_metadata_on_path,
    )
    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.run_srcmove", _fake_run_srcmove
    )

    _moved_xml, _move_results, _has_position_data = build_moved_srcdiff_xml(
        input_path=_input_path,
        revision_0_dir=tmp_path / "revision_0",
        revision_1_dir=tmp_path / "revision_1",
        revision_0_input=tmp_path / "revision_0.xml",
        revision_1_input=tmp_path / "revision_1.xml",
        tmpdir=tmp_path,
        include_skipped_tags=False,
    )

    assert _moved_xml == "annotated xml"
    assert _move_results == {"moves": []}
    assert _has_position_data is True
    assert _calls == [(_input_path, tmp_path)]


def test_diagnostic_run_passes_flag_and_rejects_existing_moves(monkeypatch, tmp_path):
    import pytest
    from srcdiffvisual.srcmove.runner import run_srcmove
    from srcdiffvisual.web.app import create_app

    _calls = []

    def _fake_run(args):
        _calls.append(args)
        (tmp_path / "moved.srcdiff.xml").write_text("<unit />")
        (tmp_path / "results.json").write_text(
            '{"moves": [], "diagnostics": {"schema_version": 4}}'
        )

    monkeypatch.setattr("srcdiffvisual.srcmove.runner.run_command", _fake_run)
    run_srcmove(
        positioned_path=tmp_path / "input.xml", tmpdir=tmp_path, diagnostics=True
    )
    assert "--diagnostics" in _calls[0]
    run_srcmove(positioned_path=tmp_path / "input.xml", tmpdir=tmp_path)
    assert "--diagnostics" not in _calls[1]
    _input = tmp_path / "input.xml"
    _input.write_text('<unit xmlns:mv="http://www.srcML.org/srcML/move" mv:id="one" />')
    monkeypatch.setattr(
        "srcdiffvisual.workflow._srcdiff.has_srcmove_annotations", lambda _: True
    )
    with pytest.raises(ValueError, match="before srcMove"):
        build_moved_srcdiff_xml(
            input_path=_input,
            revision_0_dir=tmp_path,
            revision_1_dir=tmp_path,
            revision_0_input=_input,
            revision_1_input=_input,
            tmpdir=tmp_path,
            include_skipped_tags=True,
            diagnostics=True,
        )
    _response = (
        create_app()
        .test_client()
        .post("/api/visualize", data={"srcdiff_xml": "<unit />", "diagnostics": "yes"})
    )
    assert _response.status_code == 400
