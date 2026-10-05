"""Publish the same immutable ZIP for thesis work and browser download."""
from __future__ import annotations

import os
from pathlib import Path
import shutil
from uuid import uuid4


def publish_thesis_snapshot(source: Path, repository_id: str) -> None:
    _root = os.environ.get("SRCDIFFVISUAL_HISTORY_EXPORT_ROOT")
    if not _root:
        return
    _directory = Path(_root) / repository_id
    _directory.mkdir(parents=True, exist_ok=True)
    _destination = _directory / source.name
    if _destination.exists():
        if _destination.read_bytes() != source.read_bytes():
            raise ValueError("existing thesis snapshot differs; refusing to overwrite")
        return
    _temporary = _directory / f".snapshot-{uuid4().hex}"
    shutil.copyfile(source, _temporary)
    os.replace(_temporary, _destination)
