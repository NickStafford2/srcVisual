"""Preview or prepare host bind sources for the workspace Compose services."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


REFERENCES = ("notepadpp", "sqlite", "opencv", "linux")


def _read_repositories(_path: Path) -> dict:
    _document = json.loads(_path.read_text())
    if not isinstance(_document, dict) or _document.get("schema_version") != 1:
        raise ValueError(f"Unsupported schema: {_path}")
    _repositories = _document.get("repositories")
    if not isinstance(_repositories, dict):
        raise ValueError(f"Missing repositories object: {_path}")
    return _repositories


def _contained(_parent: Path, _path: Path) -> Path:
    _resolved = _path.resolve()
    if not _resolved.is_relative_to(_parent.resolve()):
        raise ValueError(f"Path escapes {_parent}: {_path}")
    return _resolved


def prepare_workspace(_root: Path, *, _apply: bool = False) -> None:
    """Validate all inputs before cloning missing references or making directories."""
    _root = _root.resolve()
    for _name in ("srcML", "srcReader", "srcDiff", "srcMove", "srcDiffVisual"):
        if not (_root / _name / ".git").exists():
            raise ValueError(f"Restore source checkout first: {_root / _name}")
    if not (_root / "srcMove/build/srcMove").is_file():
        raise ValueError("Missing srcMove/build/srcMove; run make build from the workspace root.")
    _base = _contained(_root, _root / "srcMove/reference-repositories")
    _registry = _read_repositories(_base / "repositories.json")
    _inventory = _read_repositories(_base / "recovery-inventory.json")
    _clones = []
    _directories = []
    _paths = set()
    for _name in REFERENCES:
        _checkout = _registry[_name]["checkout"]
        if not isinstance(_checkout, str) or Path(_checkout).name != _checkout or _checkout in (".", ".."):
            raise ValueError(f"Invalid checkout folder for {_name}: {_checkout}")
        _path = _contained(_base, _base / _checkout)
        if _path in _paths:
            raise ValueError(f"Duplicate checkout folder: {_path}")
        _paths.add(_path)
        _saved = _inventory[_name]
        _origin, _commit = _saved["origin"], _saved["commit"]
        if not isinstance(_origin, str) or not _origin or _origin.startswith("-"):
            raise ValueError(f"Invalid origin for {_name}")
        if not isinstance(_commit, str) or not re.fullmatch(r"[0-9a-f]{40}", _commit):
            raise ValueError(f"Invalid saved commit for {_name}")
        if _path.exists():
            if not (_path / ".git/HEAD").is_file():
                raise ValueError(f"Review existing non-clone directory before retrying: {_path}")
            _top = subprocess.check_output(
                ["git", "-C", str(_path), "rev-parse", "--show-toplevel"], text=True
            ).strip()
            if Path(_top).resolve() != _path:
                raise ValueError(f"Not an independent Git checkout: {_path}")
            print(f"Keep existing clone: {_path.relative_to(_root)}")
        else:
            _clones.append((_name, _path, _origin, _commit))
            print(f"Clone {_origin} at {_commit} -> {_path.relative_to(_root)}")
        _directories.append(_path / ".srcmove")
        if _name == "linux":
            _directories.append(_path / ".srcmove-whole")
    _directories.extend(_root / _path for _path in (
        "thesis-workspace/data/srcMove-history",
        "srcMove/benchmark-results/bigMoveBench/thesis-runs",
        "srcMove/bigMoveBench/cache",
    ))
    for _path in _directories:
        _contained(_root, _path)
        for _ancestor in (_path, *_path.parents):
            if _ancestor.exists() and not _ancestor.is_dir():
                raise ValueError(f"Mount source parent is not a directory: {_ancestor}")
    print(f"Free disk space: {shutil.disk_usage(_root).free / 1024 ** 3:.1f} GiB")
    print(f"{len(_clones)} missing clones; {sum(not _p.exists() for _p in _directories)} directories to create.")
    if not _apply:
        print("Preview only. Repeat with --apply to prepare host paths.")
        return
    for _name, _path, _origin, _commit in _clones:
        _flags = ["--no-checkout"] if _name == "linux" else []
        subprocess.run(["git", "clone", *_flags, "--", _origin, str(_path)], check=True)
        _select = ["reset", "--soft"] if _name == "linux" else ["checkout", "--detach"]
        subprocess.run(["git", "-C", str(_path), *_select, _commit], check=True)
    for _path in _directories:
        _path.mkdir(parents=True, exist_ok=True)
    print("Host paths prepared. Start Compose from the workspace root.")


def main() -> None:
    _parser = argparse.ArgumentParser(description=__doc__)
    _parser.add_argument("--apply", action="store_true", help="clone missing references and create mount directories")
    _arguments = _parser.parse_args()
    try:
        prepare_workspace(Path(__file__).resolve().parents[2], _apply=_arguments.apply)
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as _error:
        _parser.exit(1, f"Preparation failed: {_error}\nReview any interrupted clone before retrying.\n")


if __name__ == "__main__":
    main()
