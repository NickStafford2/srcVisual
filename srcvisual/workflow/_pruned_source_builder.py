from __future__ import annotations

from srcvisual.files.models import RevisionFile
from srcvisual.workflow._source_renderer import (
    RenderedSourceFile,
    render_revision_files,
)


def build_pruned_revision_files(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    include_skipped_tags: bool,
) -> tuple[RenderedSourceFile, ...]:
    return render_revision_files(
        moved_srcdiff_xml=moved_srcdiff_xml,
        revision_files=revision_files,
        include_skipped_tags=include_skipped_tags,
    )
