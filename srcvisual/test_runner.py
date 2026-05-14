from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    frontend_root = project_root / "frontend"

    commands: list[tuple[str, list[str], Path]] = []

    if not args.frontend_only:
        commands.append(
            (
                "backend tests",
                [sys.executable, "-m", "pytest", *args.pytest_args],
                project_root,
            )
        )

    if not args.backend_only:
        npm_path = shutil.which("npm")
        if npm_path is None:
            print("npm is required to run frontend tests.", file=sys.stderr)
            return 1

        commands.append(
            (
                "frontend tests",
                [npm_path, "test", "--", *args.vitest_args],
                frontend_root,
            )
        )

    for label, command, cwd in commands:
        print(f"\n==> Running {label}: {' '.join(command)}", flush=True)
        completed = subprocess.run(command, cwd=cwd, check=False)
        if completed.returncode != 0:
            return completed.returncode

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run srcVisual backend and frontend test suites.",
    )
    parser.add_argument(
        "--backend-only",
        action="store_true",
        help="Run only backend pytest tests.",
    )
    parser.add_argument(
        "--frontend-only",
        action="store_true",
        help="Run only frontend vitest tests.",
    )
    parser.add_argument(
        "--pytest-args",
        nargs=argparse.REMAINDER,
        default=[],
        help="Additional arguments passed to pytest.",
    )
    parser.add_argument(
        "--vitest-args",
        nargs=argparse.REMAINDER,
        default=[],
        help="Additional arguments passed to npm test -- ...",
    )

    args = parser.parse_args()

    if args.backend_only and args.frontend_only:
        parser.error("Choose at most one of --backend-only or --frontend-only.")

    return args


if __name__ == "__main__":
    raise SystemExit(main())
