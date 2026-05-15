from __future__ import annotations

from srcvisual.files.revision_archive import extract_revision_files
from srcvisual.files.filenames import sanitize_filename
from srcvisual.annotated_srcdiff.tree_builder import build_tree_index
from srcvisual.core.validation import is_payload_validation_enabled
from srcvisual.srcdiff.validate_xml import validate_xml_span_index
from srcvisual.core.notify import ProgressCallback, notify_progress
from srcvisual.workflow._validate_payload import validate_visualization_payload
from srcvisual.workflow._tree_pruning import (
    get_tree_pruning_level,
    PruningLevel,
    prune_visualized_files,
)
from srcvisual.workflow._pruned_srcdiff import build_pruned_srcdiff_xml
from srcvisual.workflow._pruned_move_results import prune_move_results
from srcvisual.workflow._pruned_source_builder import build_pruned_revision_files
from srcvisual.workflow._srcdiff import build_moved_srcdiff_xml
from srcvisual.srcmove.runner import (
    is_strict_srcmove_validation_enabled,
)
from srcvisual.srcmove.validate_results import validate_srcmove_results_match_xml
from srcvisual.workflow._tempfiles import managed_tmpdir
from srcvisual.workflow.validate_tree import validate_moved_srcdiff_and_tree
from srcvisual.workflow._visualized_file_builder import build_visualized_files
from srcvisual.workflow._models import VisualizationPayload


def build_visualization_payload(
    *,
    filename: str,
    payload: bytes,
    include_skipped_tags: bool = False,
    pruning_level: PruningLevel | None = None,
    progress: ProgressCallback | None = None,
) -> VisualizationPayload:
    payload_validation_enabled = is_payload_validation_enabled()
    strict_srcmove_validation_enabled = is_strict_srcmove_validation_enabled()
    _requested_pruning_level = pruning_level or get_tree_pruning_level()

    notify_progress(
        progress,
        "Request config: "
        f"include_skipped_tags={include_skipped_tags}, "
        f"pruning_level={_requested_pruning_level}, "
        f"payload_validation={payload_validation_enabled}, "
        f"strict_srcmove_validation={strict_srcmove_validation_enabled}.",
    )

    with managed_tmpdir(progress=progress) as tmpdir:
        input_path = tmpdir / sanitize_filename(filename)
        _ = input_path.write_bytes(payload)
        notify_progress(
            progress,
            f"Saved uploaded srcdiff ({len(payload)} bytes).",
        )

        revision_0_dir = tmpdir / "revision_0"
        revision_1_dir = tmpdir / "revision_1"
        revision_0_dir.mkdir()
        revision_1_dir.mkdir()

        notify_progress(progress, "Extracting revision sources from srcdiff.")
        extracted_layout = extract_revision_files(
            input_path=input_path,
            revision_0_dir=revision_0_dir,
            revision_1_dir=revision_1_dir,
        )
        revision_files = extracted_layout.files
        notify_progress(
            progress,
            f"Extracted revision sources for {len(revision_files)} file(s).",
        )

        if not revision_files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        moved_srcdiff_xml, move_results, _should_validate_srcmove_results = (
            build_moved_srcdiff_xml(
                input_path=input_path,
                revision_0_dir=revision_0_dir,
                revision_1_dir=revision_1_dir,
                revision_0_input=extracted_layout.revision_0_input,
                revision_1_input=extracted_layout.revision_1_input,
                tmpdir=tmpdir,
                include_skipped_tags=include_skipped_tags,
                progress=progress,
            )
        )
        notify_progress(
            progress,
            "Prepared moved srcdiff XML: "
            f"files={len(revision_files)}, moves={move_results.get('move_count', '?')}.",
        )

        if strict_srcmove_validation_enabled:
            notify_progress(
                progress,
                "Strict srcMove validation is enabled. Validating results.json against moved XML.",
            )
            validate_srcmove_results_match_xml(
                moved_srcdiff_xml=moved_srcdiff_xml,
                move_results=move_results,
                include_skipped_tags=include_skipped_tags,
            )
        else:
            notify_progress(
                progress,
                "Skipping strict srcMove results validation.",
            )

        if payload_validation_enabled:
            notify_progress(progress, "Validating moved srcdiff XML.")
            validate_xml_span_index(
                moved_srcdiff_xml=moved_srcdiff_xml,
                include_skipped_tags=include_skipped_tags,
            )
            notify_progress(progress, "Validated moved srcdiff XML.")
        else:
            notify_progress(progress, "Skipping moved srcdiff validation.")

        notify_progress(progress, "Normalizing move partner node ids.")
        notify_progress(progress, "Building tree view data.")
        tree_by_unit, has_position_data = build_tree_index(
            moved_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )
        notify_progress(
            progress,
            "Built tree view data: "
            f"units={len(tree_by_unit)}, has_position_data={has_position_data}.",
        )

        visualized_files = build_visualized_files(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=revision_files,
            tree_by_unit=tree_by_unit,
        )
        notify_progress(
            progress,
            f"Built visualized file payloads for {len(visualized_files)} file(s).",
        )

        if payload_validation_enabled:
            notify_progress(progress, "Validating moved XML against full tree data.")
            validate_moved_srcdiff_and_tree(
                moved_srcdiff_xml=moved_srcdiff_xml,
                revision_files=revision_files,
                visualized_files=visualized_files,
                include_skipped_tags=include_skipped_tags,
            )
            notify_progress(progress, "Validated moved XML against full tree data.")

    full_payload_result = VisualizationPayload(
        source_filename=filename,
        moved_srcdiff_xml=moved_srcdiff_xml,
        move_results=move_results,
        has_position_data=has_position_data,
        files=visualized_files,
    )

    if payload_validation_enabled:
        notify_progress(progress, "Validating full visualization payload.")
        validate_visualization_payload(full_payload_result)
        notify_progress(progress, "Validated full visualization payload.")

    _original_file_count = len(visualized_files)
    _pruning_level = _requested_pruning_level

    notify_progress(
        progress,
        f"Pruning visualization payload with level: {_pruning_level}.",
    )
    _pruned_visualized_files = prune_visualized_files(
        visualized_files,
        level=_pruning_level,
    )

    _pruned_file_count = _original_file_count - len(_pruned_visualized_files)
    notify_progress(
        progress,
        f"Pruned {_pruned_file_count} file(s) using level: {_pruning_level}.",
    )

    _needs_filtered_rebuild = _pruning_level != "none" or not include_skipped_tags

    if _needs_filtered_rebuild:
        _rebuild_reasons: list[str] = []
        if _pruning_level != "none":
            _rebuild_reasons.append(f"pruning_level={_pruning_level}")
        if not include_skipped_tags:
            _rebuild_reasons.append("include_skipped_tags=false")
        notify_progress(
            progress,
            "Rebuilding payload from filtered XML "
            f"(reason: {', '.join(_rebuild_reasons)}).",
        )
        moved_srcdiff_xml = build_pruned_srcdiff_xml(
            moved_srcdiff_xml=moved_srcdiff_xml,
            visualized_files=_pruned_visualized_files,
            include_skipped_tags=include_skipped_tags,
        )
        notify_progress(progress, "Rebuilt pruned srcdiff XML.")
        if payload_validation_enabled:
            notify_progress(progress, "Validating pruned srcdiff XML.")
            validate_xml_span_index(
                moved_srcdiff_xml=moved_srcdiff_xml,
                include_skipped_tags=include_skipped_tags,
            )
            notify_progress(progress, "Validated pruned srcdiff XML.")
        notify_progress(progress, "Rebuilding pruned tree view data.")
        tree_by_unit, has_position_data = build_tree_index(
            moved_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )
        notify_progress(
            progress,
            "Rebuilt pruned tree view data: "
            f"units={len(tree_by_unit)}, has_position_data={has_position_data}.",
        )
        _kept_revision_files = tuple(
            _visualized_file.revision_file for _visualized_file in _pruned_visualized_files
        )
        notify_progress(
            progress,
            f"Rendering pruned revision sources for {len(_kept_revision_files)} file(s).",
        )
        _rendered_revision_files = build_pruned_revision_files(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=_kept_revision_files,
            include_skipped_tags=include_skipped_tags,
        )
        notify_progress(
            progress,
            f"Rendered pruned revision sources for {len(_rendered_revision_files)} file(s).",
        )
        revision_files = tuple(
            _rendered_file.revision_file for _rendered_file in _rendered_revision_files
        )
        notify_progress(progress, "Rebuilding pruned visualized file payloads.")
        visualized_files = build_visualized_files(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=revision_files,
            tree_by_unit=tree_by_unit,
        )
        notify_progress(
            progress,
            f"Rebuilt pruned visualized file payloads for {len(visualized_files)} file(s).",
        )
        visualized_files = _apply_rendered_source_spans(
            visualized_files=visualized_files,
            rendered_revision_files=_rendered_revision_files,
        )
        has_position_data = any(
            _rendered_file.revision_0_spans_by_path
            or _rendered_file.revision_1_spans_by_path
            for _rendered_file in _rendered_revision_files
        )
        notify_progress(
            progress,
            f"Applied rendered source spans to pruned payloads (has_position_data={has_position_data}).",
        )
    else:
        notify_progress(
            progress,
            "Skipping filtered rebuild "
            "(pruning_level=none and include_skipped_tags=true).",
        )
        visualized_files = _pruned_visualized_files

    notify_progress(progress, "Pruning move results.")
    move_results = prune_move_results(
        moved_srcdiff_xml=moved_srcdiff_xml,
        move_results=move_results,
        include_skipped_tags=include_skipped_tags,
    )
    notify_progress(
        progress,
        f"Pruned move results: moves={move_results.get('move_count', '?')}.",
    )

    final_payload = VisualizationPayload(
        source_filename=filename,
        moved_srcdiff_xml=moved_srcdiff_xml,
        move_results=move_results,
        has_position_data=has_position_data,
        files=visualized_files,
    )

    if payload_validation_enabled:
        notify_progress(progress, "Validating pruned visualization payload.")
        validate_moved_srcdiff_and_tree(
            moved_srcdiff_xml=final_payload.moved_srcdiff_xml,
            revision_files=revision_files,
            visualized_files=final_payload.files,
            include_skipped_tags=include_skipped_tags,
        )
        validate_visualization_payload(final_payload)
        notify_progress(progress, "Validated pruned visualization payload.")
    else:
        notify_progress(progress, "Skipping pruned payload validation.")

    return final_payload


def _apply_rendered_source_spans(
    *,
    visualized_files,
    rendered_revision_files,
):
    _rendered_by_unit_id = {
        _rendered.revision_file.unit_id: _rendered
        for _rendered in rendered_revision_files
    }
    _updated_files = []

    for _visualized_file in visualized_files:
        _rendered = _rendered_by_unit_id[_visualized_file.revision_file.unit_id]
        _updated_files.append(
            type(_visualized_file)(
                revision_file=_rendered.revision_file,
                tree=(
                    None
                    if _visualized_file.tree is None
                    else _apply_tree_spans(
                        tree=_visualized_file.tree,
                        revision_0_spans_by_path=_rendered.revision_0_spans_by_path,
                        revision_1_spans_by_path=_rendered.revision_1_spans_by_path,
                    )
                ),
            )
        )

    return tuple(_updated_files)


def _apply_tree_spans(
    *,
    tree,
    revision_0_spans_by_path,
    revision_1_spans_by_path,
):
    _path = tree["path"]
    _updated_tree = tree.copy()
    _updated_tree["revision_0_span"] = _span_to_dict(
        revision_0_spans_by_path.get(_path)
    )
    _updated_tree["revision_1_span"] = _span_to_dict(
        revision_1_spans_by_path.get(_path)
    )
    _updated_tree["children"] = [
        _apply_tree_spans(
            tree=_child,
            revision_0_spans_by_path=revision_0_spans_by_path,
            revision_1_spans_by_path=revision_1_spans_by_path,
        )
        for _child in tree["children"]
    ]
    return _updated_tree


def _span_to_dict(span):
    if span is None:
        return None

    return span.to_dict()
