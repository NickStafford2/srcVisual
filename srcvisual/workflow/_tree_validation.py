from __future__ import annotations

from srcvisual.srcdiff.tree_validation import (
    assert_srcdiff_units_match_visualized_files,
)
from srcvisual.srcmove.tree_validation import (
    assert_moved_srcdiff_matches_visualized_tree_moves,
)
from srcvisual.workflow.models import RevisionFile, VisualizedFile


def validate_moved_srcdiff_and_tree(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    visualized_files: tuple[VisualizedFile, ...],
    include_skipped_tags: bool,
) -> None:
    assert_srcdiff_units_match_visualized_files(
        moved_srcdiff_xml=moved_srcdiff_xml,
        revision_files=revision_files,
        visualized_files=visualized_files,
    )

    assert_moved_srcdiff_matches_visualized_tree_moves(
        moved_srcdiff_xml=moved_srcdiff_xml,
        visualized_files=visualized_files,
        include_skipped_tags=include_skipped_tags,
    )
