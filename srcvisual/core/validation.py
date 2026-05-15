from __future__ import annotations


class SrcVisualValidationError(AssertionError):
    """Raised when srcVisual generated payloads fail internal consistency checks."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SrcVisualValidationError(message)
