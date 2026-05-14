from typing import Callable


ProgressCallback = Callable[[str], None]


def notify_progress(
    progress: ProgressCallback | None,
    message: str,
) -> None:
    if progress is not None:
        progress(message)
