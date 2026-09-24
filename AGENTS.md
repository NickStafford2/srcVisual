# AGENTS.md

Guidance for AI agents working in the srcVisual repository.

## Repository scope

srcVisual is an independent repository containing a Python/Flask backend and a
React frontend for inspecting srcDiff and srcMove results. It is commonly
checked out as `srcVisual/` inside the SrcMLBuildTemplate workspace, but its
source and Git history belong to this repository.

## Required reading

- [README.md](README.md): product purpose, current behavior, and hosted vision
- [docs/README.md](docs/README.md): documentation index
- [docs/Rules.md](docs/Rules.md): canonical application and data invariants
- [docs/ProgrammingStyle.md](docs/ProgrammingStyle.md): implementation style
- [docs/Debugging.md](docs/Debugging.md): test and debugging entry points

When working inside SrcMLBuildTemplate, also read the parent's
`docs/workspace.md` before changing Docker integration, build paths, or
cross-repository workflows.

## Development environment

On macOS, edit files on the host and run builds, tests, and Linux-specific
diagnostics in the parent SrcMLBuildTemplate Docker environment. Use repeatable
non-interactive commands through `../bin/srcml-dev-shell`; do not assume an
agent can attach to a shell that the user already opened.

The running backend requires `archive_reader`, `srcdiff`, and `srcMove` on
`PATH`. Those binaries are supplied by the parent workspace or the packaged
application image.

## Build and test entry points

Use the repository Make targets:

```bash
make test
make lint
make test-backend
make test-backend-unit
make test-frontend
```

`make test` is the authoritative full check. Backend targets use the packaged
Linux image containing `archive_reader`, `srcdiff`, and `srcMove`; do not use a
Python-only image for the integration suite. Pass `PYTEST_ARGS='...'` to focus
the backend suite. See [docs/Debugging.md](docs/Debugging.md) for details and
temporary-file controls.

Prefer existing fixtures and test helpers. Changes to XML processing, move
metadata, pruning, or source spans should cover both archive-style and
single-root srcDiff inputs when applicable.

## Editing rules

- Follow [docs/Rules.md](docs/Rules.md); all panes must derive from the same
  final data, and temporary implementation metadata must not leak into output.
- Follow [docs/ProgrammingStyle.md](docs/ProgrammingStyle.md) for Python package
  boundaries and naming.
- Keep backend/frontend payload types explicit. Do not introduce silent
  fallbacks that hide a contract mismatch.
- Do not commit `.venv/`, `frontend/node_modules/`, `frontend/dist/`, `temp/`,
  caches, or other generated output.
- Preserve unrelated user changes and report generated files and commands run.

## Documentation

Human-facing documentation is the technical source of truth. Keep `README.md`
as the product entry point, `docs/README.md` as the index, and durable behavior
in the most specific document. Keep `todo.md` and `notes.md` explicitly
non-authoritative. Link instead of repeating facts.

Use this file only for agent operating instructions. Do not put architecture,
product history, or research claims exclusively in `AGENTS.md`.

## Security

The hosted application described in the README is a future goal. The current
backend invokes native tools and processes user-controlled XML. Do not describe
it as safe for public untrusted input or expose it publicly without explicit
authorization and a concrete sandboxing, resource-limiting, and threat-modeling
review.

## Git

Do not revert, stage, commit, or push user changes unless explicitly requested.
