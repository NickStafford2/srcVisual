from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import re

from srcdiffvisual.history.client import HistoryConfigurationError

_REPOSITORY_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


@dataclass(frozen=True)
class HistoryRepository:
    repository_id: str
    label: str
    path: Path

    def public_dict(self) -> dict[str, str]:
        return {"id": self.repository_id, "label": self.label}


@dataclass(frozen=True)
class HistoryRepositoryRegistry:
    repositories: dict[str, HistoryRepository]
    default_id: str

    def resolve(self, repository_id: str | None) -> HistoryRepository:
        selected_id = repository_id or self.default_id
        if selected_id == "default":
            selected_id = self.default_id
        try:
            return self.repositories[selected_id]
        except KeyError as error:
            raise ValueError(f"Unknown history repository: {selected_id}") from error

    def public_dict(self) -> dict[str, object]:
        return {
            "schema_version": 1,
            "default_id": self.default_id,
            "repositories": [
                repository.public_dict()
                for repository in self.repositories.values()
            ],
        }


def get_history_repository_registry() -> HistoryRepositoryRegistry | None:
    raw_registry = os.environ.get(
        "SRCDIFFVISUAL_HISTORY_REPOSITORIES", ""
    ).strip()
    if raw_registry:
        try:
            document = json.loads(raw_registry)
        except json.JSONDecodeError as error:
            raise HistoryConfigurationError(
                "SRCDIFFVISUAL_HISTORY_REPOSITORIES must be valid JSON."
            ) from error
        if not isinstance(document, list) or not document:
            raise HistoryConfigurationError(
                "SRCDIFFVISUAL_HISTORY_REPOSITORIES must be a nonempty JSON array."
            )
        repositories: dict[str, HistoryRepository] = {}
        for item in document:
            if not isinstance(item, dict):
                raise HistoryConfigurationError(
                    "Every configured history repository must be an object."
                )
            repository_id = item.get("id")
            label = item.get("label")
            raw_path = item.get("path")
            if not isinstance(repository_id, str) or not _REPOSITORY_ID.fullmatch(
                repository_id
            ):
                raise HistoryConfigurationError(
                    "History repository IDs must contain lowercase letters, digits, "
                    "or hyphens and begin with a letter or digit."
                )
            if repository_id in repositories:
                raise HistoryConfigurationError(
                    f"Duplicate history repository ID: {repository_id}"
                )
            if not isinstance(label, str) or not label.strip():
                raise HistoryConfigurationError(
                    f"History repository {repository_id} requires a label."
                )
            if not isinstance(raw_path, str) or not raw_path.strip() or "\0" in raw_path:
                raise HistoryConfigurationError(
                    f"History repository {repository_id} requires a valid path."
                )
            repositories[repository_id] = HistoryRepository(
                repository_id=repository_id,
                label=label.strip(),
                path=Path(raw_path).expanduser().absolute(),
            )
        default_id = os.environ.get(
            "SRCDIFFVISUAL_DEFAULT_HISTORY_REPOSITORY", ""
        ).strip() or next(iter(repositories))
        if default_id not in repositories:
            raise HistoryConfigurationError(
                "SRCDIFFVISUAL_DEFAULT_HISTORY_REPOSITORY does not name a configured "
                "repository."
            )
        return HistoryRepositoryRegistry(repositories, default_id)

    raw_repository = os.environ.get(
        "SRCDIFFVISUAL_HISTORY_REPOSITORY", ""
    ).strip()
    if not raw_repository:
        return None
    if "\0" in raw_repository:
        raise HistoryConfigurationError(
            "SRCDIFFVISUAL_HISTORY_REPOSITORY contains an invalid null byte."
        )
    repository = HistoryRepository(
        repository_id="default",
        label=Path(raw_repository).name or "Repository",
        path=Path(raw_repository).expanduser().absolute(),
    )
    return HistoryRepositoryRegistry({"default": repository}, "default")
