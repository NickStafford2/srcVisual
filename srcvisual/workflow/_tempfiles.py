from __future__ import annotations

import shutil
import tempfile
from contextlib import contextmanager
import os
from pathlib import Path

from ._notify import notify_progress, ProgressCallback

DEFAULT_TMP_ROOT = Path(__file__).resolve().parents[2] / "temp"


@contextmanager
def managed_tmpdir(
    *,
    progress: ProgressCallback | None = None,
):
    tmp_root = get_tmp_root()
    tmp_root.mkdir(parents=True, exist_ok=True)
    tmpdir = Path(tempfile.mkdtemp(prefix="srcvisual-", dir=tmp_root))
    keep_tmp = should_keep_tmp()

    notify_progress(progress, f"Using temp directory: {tmpdir}")

    try:
        yield tmpdir
    finally:
        if keep_tmp:
            notify_progress(
                progress, f"Keeping temp directory for inspection: {tmpdir}"
            )
        else:
            shutil.rmtree(tmpdir, ignore_errors=True)


def get_tmp_root() -> Path:
    configured = os.environ.get("SRCVISUAL_TMP_ROOT", "").strip()

    if not configured:
        return DEFAULT_TMP_ROOT

    return Path(configured).expanduser()


def should_keep_tmp() -> bool:
    return os.environ.get("SRCVISUAL_KEEP_TMP", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
