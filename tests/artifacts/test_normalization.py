from srcvisual.artifacts.normalization import normalize_annotated_xml
from srcvisual.artifacts.models import ArtifactProvenance


def test_history_normalization_replaces_only_root_scratch_url() -> None:
    xml = """<?xml version="1.0"?>
<unit xmlns="http://www.srcML.org/srcML/src" url="/scratch/original|/scratch/modified">
<unit filename="kept.cpp" url="user-value"><name>value</name></unit>
</unit>
"""

    normalized = normalize_annotated_xml(
        xml,
        provenance=ArtifactProvenance(origin="history", history_pair=7),
    )

    assert 'url="revision-0|revision-1"' in normalized
    assert '<unit filename="kept.cpp" url="user-value">' in normalized
    assert "/scratch/" not in normalized


def test_upload_normalization_preserves_user_metadata() -> None:
    xml = '<unit url="/user/original|/user/modified" />'

    assert (
        normalize_annotated_xml(
            xml,
            provenance=ArtifactProvenance(origin="upload"),
        )
        == xml
    )
