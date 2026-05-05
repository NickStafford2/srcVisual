#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    srcvisual_dir = script_dir.parent
    workspace_dir = srcvisual_dir.parent

    e2e_custom_dir = workspace_dir / "srcMove" / "test" / "e2e_custom" / "test_out"
    e2e_generated_dir = workspace_dir / "srcMove" / "test" / "e2e_generated"
    examples_dir = srcvisual_dir / "examples"

    if not e2e_custom_dir.is_dir():
        raise SystemExit(f"Source directory not found: {e2e_custom_dir}")

    if not e2e_generated_dir.is_dir():
        raise SystemExit(f"Source directory not found: {e2e_generated_dir}")

    examples_dir.mkdir(parents=True, exist_ok=True)
    clear_examples_dir(examples_dir)

    copied = 0
    copied += copy_e2e_custom_examples(e2e_custom_dir, examples_dir)
    copied += copy_e2e_generated_examples(e2e_generated_dir, examples_dir)

    print(f"Copied {copied} example file(s) into {examples_dir}")


def copy_e2e_custom_examples(source_dir: Path, examples_dir: Path) -> int:
    copied = 0
    for case_dir in sorted(path for path in source_dir.iterdir() if path.is_dir()):
        output_path = case_dir / "output.xml"
        if not output_path.is_file():
            continue

        target_name = f"e2e_custom_{case_dir.name}.xml"
        shutil.copyfile(output_path, examples_dir / target_name)
        copied += 1

    return copied


def copy_e2e_generated_examples(source_dir: Path, examples_dir: Path) -> int:
    copied = 0
    for case_dir in sorted(path for path in source_dir.iterdir() if path.is_dir()):
        diff_path = case_dir / "diff.xml"
        if not diff_path.is_file():
            continue

        target_name = f"e2e_generated_{case_dir.name}_diff.xml"
        shutil.copyfile(diff_path, examples_dir / target_name)
        copied += 1

    return copied


def clear_examples_dir(examples_dir: Path) -> None:
    for child in examples_dir.iterdir():
        if child.name.startswith("."):
            continue

        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


if __name__ == "__main__":
    main()
