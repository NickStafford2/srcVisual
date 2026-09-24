from __future__ import annotations

from flask import Blueprint, current_app, request

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.artifacts.projections import read_artifact_manifest
from srcvisual.bigmovebench.bundles import (
    publish_review_bundle,
    read_review_case,
    read_review_manifest,
)
from srcvisual.workflow.payload import build_visualization_artifact


bigmovebench_api = Blueprint("bigmovebench_api", __name__)


@bigmovebench_api.post("/bigmovebench/reviews")
def import_review() -> tuple[dict[str, object], int]:
    _upload = request.files.get("review_bundle")
    if _upload is None or not _upload.filename:
        return {"error": "Choose a BigMoveBench review ZIP."}, 400
    try:
        _manifest = publish_review_bundle(
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            payload=_upload.read(),
        )
    except ValueError as _error:
        return {"error": str(_error)}, 400
    return _manifest, 201


@bigmovebench_api.get("/bigmovebench/reviews/<review_id>")
def review_manifest(review_id: str) -> tuple[dict[str, object], int]:
    try:
        return read_review_manifest(
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            review_id=review_id,
        ), 200
    except ValueError as _error:
        return {"error": str(_error)}, 404


@bigmovebench_api.get("/bigmovebench/reviews/<review_id>/cases/<int:ordinal>")
def review_case(review_id: str, ordinal: int) -> tuple[dict[str, object], int]:
    try:
        _review, _ = read_review_case(
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            review_id=review_id,
            ordinal=ordinal,
        )
        return _review, 200
    except ValueError as _error:
        return {"error": str(_error)}, 404


@bigmovebench_api.post(
    "/bigmovebench/reviews/<review_id>/cases/<int:ordinal>/visualize"
)
def visualize_review_case(
    review_id: str, ordinal: int
) -> tuple[dict[str, object], int]:
    try:
        _review, _directory = read_review_case(
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            review_id=review_id,
            ordinal=ordinal,
        )
        _results = _review.get("results")
        if not isinstance(_results, dict):
            raise ValueError("BigMoveBench review results are invalid.")
        _published = build_visualization_artifact(
            filename=f"bigmovebench-type3-{ordinal:04d}.xml",
            payload=(_directory / "srcmove.xml").read_bytes(),
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            provenance=ArtifactProvenance(
                origin="upload", move_results_source="provided"
            ),
            producer_move_results=_results,
        )
        return read_artifact_manifest(
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            artifact_id=_published.artifact_id,
        ), 200
    except (OSError, ValueError) as _error:
        return {"error": str(_error)}, 400
