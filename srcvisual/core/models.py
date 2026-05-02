from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str


@dataclass(frozen=True)
class SourceSpan:
    start_line: int
    start_col: int
    end_line: int
    end_col: int

    def to_dict(self) -> dict[str, int]:
        return {
            "start_line": self.start_line,
            "start_col": self.start_col,
            "end_line": self.end_line,
            "end_col": self.end_col,
        }


TreeNode = dict[str, object]
