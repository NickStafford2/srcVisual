from __future__ import annotations

from pathlib import Path
from typing import Any

from srcvisual.artifacts.normalization import normalize_annotated_xml
from srcvisual.artifacts.models import ArtifactProvenance, PublishedArtifact
from srcvisual.artifacts.store import (
    get_artifact_root,
    publish_artifact,
)
from srcvisual.files.revision_archive import extract_revision_files
from srcvisual.files.filenames import sanitize_filename
from srcvisual.annotated_srcdiff.tree_builder import build_tree_index
from srcvisual.core.validation import is_payload_validation_enabled
from srcvisual.srcdiff.validate_xml import validate_xml_span_index
from srcvisual.core.notify import ProgressCallback, notify_progress
from srcvisual.workflow._validate_payload import validate_visualization_payload
from srcvisual.workflow._source_renderer import render_revision_files
from srcvisual.workflow._srcdiff import build_moved_srcdiff_xml
from srcvisual.srcmove.runner import (
    is_strict_srcmove_validation_enabled,
)
from srcvisual.srcmove.existing_annotations import (
    build_move_results_from_moved_srcdiff,
)
from srcvisual.srcmove.move_result_enrichment import (
    augment_move_results_with_node_ids,
    merge_producer_move_results,
)
from srcvisual.srcmove.validate_results import validate_srcmove_results_match_xml
from srcvisual.workflow._tempfiles import managed_tmpdir
from srcvisual.workflow.validate_tree import validate_moved_srcdiff_and_tree
from srcvisual.workflow._visualized_file_builder import build_visualized_files
from srcvisual.workflow.models import VisualizationPayload


def build_visualization_artifact(
    *,
    filename: str,
    payload: bytes,
    progress: ProgressCallback | None = None,
    artifact_root: Path | None = None,
    provenance: ArtifactProvenance | None = None,
    producer_move_results: dict[str, Any] | None = None,
    artifact_id: str | None = None,
) -> PublishedArtifact:
    """Build and publish a canonical visualization artifact."""
    _artifact_root = artifact_root or get_artifact_root()
    _published, _ = _publish_canonical_visualization(
        filename=filename,
        payload=payload,
        progress=progress,
        artifact_root=_artifact_root,
        provenance=provenance,
        producer_move_results=producer_move_results,
        artifact_id=artifact_id,
    )
    return _published


def _publish_canonical_visualization(
    *,
    filename: str,
    payload: bytes,
    progress: ProgressCallback | None,
    artifact_root: Path,
    provenance: ArtifactProvenance | None,
    producer_move_results: dict[str, Any] | None,
    artifact_id: str | None = None,
) -> tuple[PublishedArtifact, ArtifactProvenance]:
    _provenance = provenance or ArtifactProvenance(origin="upload")
    _canonical_payload, _effective_provenance = _build_canonical_payload(
        filename=filename,
        payload=payload,
        progress=progress,
        provenance=_provenance,
        producer_move_results=producer_move_results,
    )
    notify_progress(progress, "Publishing immutable visualization artifact.")
    _published = publish_artifact(
        artifact_root=artifact_root,
        canonical_payload=_canonical_payload,
        input_payload=payload,
        provenance=_effective_provenance,
        artifact_id=artifact_id,
    )
    notify_progress(
        progress, f"Published visualization artifact {_published.artifact_id}."
    )
    return _published, _effective_provenance


def _build_canonical_payload(
    *,
    filename: str,
    payload: bytes,
    progress: ProgressCallback | None,
    provenance: ArtifactProvenance,
    producer_move_results: dict[str, Any] | None,
) -> tuple[VisualizationPayload, ArtifactProvenance]:
    payload_validation_enabled = is_payload_validation_enabled()
    strict_srcmove_validation_enabled = is_strict_srcmove_validation_enabled()

    notify_progress(
        progress,
        "Request config: "
        "canonical_include_skipped_tags=true, "
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

        moved_srcdiff_xml, move_results, _generated_move_results = (
            build_moved_srcdiff_xml(
                input_path=input_path,
                revision_0_dir=revision_0_dir,
                revision_1_dir=revision_1_dir,
                revision_0_input=extracted_layout.revision_0_input,
                revision_1_input=extracted_layout.revision_1_input,
                tmpdir=tmpdir,
                include_skipped_tags=True,
                progress=progress,
            )
        )
        moved_srcdiff_xml = normalize_annotated_xml(
            moved_srcdiff_xml,
            provenance=provenance,
        )
        if _generated_move_results:
            validate_srcmove_results_match_xml(
                moved_srcdiff_xml=moved_srcdiff_xml,
                move_results=move_results,
                include_skipped_tags=True,
                allow_additional_xml_moves=True,
            )
            _reconstructed_results = build_move_results_from_moved_srcdiff(
                moved_srcdiff_xml=moved_srcdiff_xml,
                include_skipped_tags=True,
            )
            move_results = merge_producer_move_results(
                reconstructed_results=_reconstructed_results,
                producer_results=move_results,
            )
        if producer_move_results is not None:
            validate_srcmove_results_match_xml(
                moved_srcdiff_xml=moved_srcdiff_xml,
                move_results=producer_move_results,
                include_skipped_tags=True,
                allow_additional_xml_moves=True,
            )
            _reconstructed_results = build_move_results_from_moved_srcdiff(
                moved_srcdiff_xml=moved_srcdiff_xml,
                include_skipped_tags=True,
            )
            move_results = merge_producer_move_results(
                reconstructed_results=_reconstructed_results,
                producer_results=producer_move_results,
            )
            notify_progress(
                progress,
                "Merged retained producer metadata with all XML move annotations.",
            )
        notify_progress(
            progress,
            "Prepared moved srcdiff XML: "
            f"files={len(revision_files)}, moves={move_results.get('move_count', '?')}, "
            f"xml_bytes={len(moved_srcdiff_xml.encode('utf-8'))}.",
        )

        if (
            strict_srcmove_validation_enabled
            and not _generated_move_results
            and producer_move_results is None
        ):
            notify_progress(
                progress,
                "Strict srcMove validation is enabled. Validating results.json against moved XML.",
            )
            validate_srcmove_results_match_xml(
                moved_srcdiff_xml=moved_srcdiff_xml,
                move_results=move_results,
                include_skipped_tags=True,
            )
        else:
            notify_progress(
                progress,
                "Skipping strict srcMove results validation "
                "(strict_srcmove_validation=false).",
            )

        if payload_validation_enabled:
            notify_progress(progress, "Validating moved srcdiff XML.")
            validate_xml_span_index(
                moved_srcdiff_xml=moved_srcdiff_xml,
                include_skipped_tags=True,
            )
            notify_progress(progress, "Validated moved srcdiff XML.")
        else:
            notify_progress(
                progress,
                "Skipping moved srcdiff validation (payload_validation=false).",
            )

        notify_progress(progress, "Normalizing move partner node ids.")
        notify_progress(progress, "Building tree view data.")
        tree_by_unit, has_position_data = build_tree_index(
            moved_srcdiff_xml,
            include_skipped_tags=True,
        )
        _tree_node_count, _tree_move_count = _count_tree_nodes_and_moves(tree_by_unit)
        notify_progress(
            progress,
            "Built tree view data: "
            f"units={len(tree_by_unit)}, "
            f"nodes={_tree_node_count}, "
            f"move_nodes={_tree_move_count}, "
            f"has_position_data={has_position_data}.",
        )

        visualized_files = build_visualized_files(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=revision_files,
            tree_by_unit=tree_by_unit,
        )
        notify_progress(progress, "Rendering canonical source spans.")
        _rendered_revision_files = render_revision_files(
            moved_srcdiff_xml=moved_srcdiff_xml,
            revision_files=revision_files,
            include_skipped_tags=True,
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
        _revision_0_chars, _revision_1_chars = _count_source_chars(visualized_files)
        notify_progress(
            progress,
            "Built visualized file payloads for "
            f"{len(visualized_files)} file(s): "
            f"revision_0_chars={_revision_0_chars}, "
            f"revision_1_chars={_revision_1_chars}.",
        )

        if payload_validation_enabled:
            notify_progress(progress, "Validating moved XML against full tree data.")
            validate_moved_srcdiff_and_tree(
                moved_srcdiff_xml=moved_srcdiff_xml,
                revision_files=revision_files,
                visualized_files=visualized_files,
                include_skipped_tags=True,
            )
            notify_progress(progress, "Validated moved XML against full tree data.")

    move_results = augment_move_results_with_node_ids(
        moved_srcdiff_xml=moved_srcdiff_xml,
        move_results=move_results,
    )
    _canonical_payload = VisualizationPayload(
        source_filename=filename,
        moved_srcdiff_xml=moved_srcdiff_xml,
        move_results=move_results,
        has_position_data=has_position_data,
        files=visualized_files,
    )

    if payload_validation_enabled:
        notify_progress(progress, "Validating canonical visualization payload.")
        validate_visualization_payload(_canonical_payload)
        notify_progress(progress, "Validated canonical visualization payload.")

    _move_results_source = (
        "provided"
        if producer_move_results is not None
        else "generated"
        if _generated_move_results
        else "reconstructed"
    )
    _effective_provenance = ArtifactProvenance(
        origin=provenance.origin,
        history_pair=provenance.history_pair,
        move_results_source=_move_results_source,
    )
    return _canonical_payload, _effective_provenance


def _count_tree_nodes_and_moves(tree_by_unit) -> tuple[int, int]:
    total_nodes = 0
    move_nodes = 0

    for tree in tree_by_unit.values():
        _nodes, _moves = _count_tree_node_subtree(tree)
        total_nodes += _nodes
        move_nodes += _moves

    return total_nodes, move_nodes


def _count_tree_node_subtree(node) -> tuple[int, int]:
    total_nodes = 1
    move_nodes = 1 if node.get("kind") == "move" else 0

    for child in node["children"]:
        _child_nodes, _child_moves = _count_tree_node_subtree(child)
        total_nodes += _child_nodes
        move_nodes += _child_moves

    return total_nodes, move_nodes


def _count_source_chars(visualized_files) -> tuple[int, int]:
    revision_0_chars = 0
    revision_1_chars = 0

    for visualized_file in visualized_files:
        revision_0_chars += len(visualized_file.revision_file.revision_0_source_code)
        revision_1_chars += len(visualized_file.revision_file.revision_1_source_code)

    return revision_0_chars, revision_1_chars


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
