from __future__ import annotations

import argparse
import json
from pathlib import Path

from srcvisual.artifacts.lifecycle import (
    ArtifactRetentionPolicy,
    apply_artifact_collection,
    inventory_artifacts,
    plan_artifact_collection,
)
from srcvisual.artifacts.store import get_artifact_root
from srcvisual.runs.store import RunStore, get_run_database_path


def main() -> None:
    _arguments = _parse_arguments()
    _artifact_root = (_arguments.artifact_root or get_artifact_root()).resolve()
    _run_database = get_run_database_path(_artifact_root)
    _protected_artifact_ids = (
        RunStore(_run_database).referenced_artifact_ids()
        if _run_database.is_file()
        else frozenset()
    )
    _inventory = inventory_artifacts(
        artifact_root=_artifact_root,
        protected_artifact_ids=_protected_artifact_ids,
    )
    _policy = ArtifactRetentionPolicy(
        max_artifacts=_arguments.max_artifacts,
        max_bytes=_arguments.max_bytes,
        max_age_seconds=(
            None
            if _arguments.max_age_days is None
            else round(_arguments.max_age_days * 24 * 60 * 60)
        ),
    )
    _plan = plan_artifact_collection(_inventory, _policy)
    _result = None
    if _arguments.apply_plan is not None:
        _result = apply_artifact_collection(
            artifact_root=_artifact_root,
            policy=_policy,
            expected_plan_id=_arguments.apply_plan,
            protected_artifact_ids=(
                lambda: RunStore(_run_database).referenced_artifact_ids()
                if _run_database.is_file()
                else frozenset()
            ),
        )
    print(
        json.dumps(
            {
                "artifact_root": str(_artifact_root),
                "inventory": _inventory.to_dict(),
                "collection_plan": _plan.to_dict(),
                "collection_result": (
                    None if _result is None else _result.to_dict()
                ),
            },
            indent=2,
            sort_keys=True,
        )
    )


def _parse_arguments() -> argparse.Namespace:
    _parser = argparse.ArgumentParser(
        description=(
            "Inspect srcVisual artifact storage and report dry-run collection "
            "candidates. This command never deletes artifacts."
        )
    )
    _parser.add_argument("--artifact-root", type=Path)
    _parser.add_argument("--max-artifacts", type=_nonnegative_integer)
    _parser.add_argument("--max-bytes", type=_nonnegative_integer)
    _parser.add_argument("--max-age-days", type=_nonnegative_float)
    _parser.add_argument(
        "--apply-plan",
        metavar="PLAN_ID",
        help="delete candidates only if a fresh plan still has this exact ID",
    )
    return _parser.parse_args()


def _nonnegative_integer(raw_value: str) -> int:
    _value = int(raw_value)
    if _value < 0:
        raise argparse.ArgumentTypeError("value must be nonnegative")
    return _value


def _nonnegative_float(raw_value: str) -> float:
    _value = float(raw_value)
    if _value < 0:
        raise argparse.ArgumentTypeError("value must be nonnegative")
    return _value


if __name__ == "__main__":
    main()
