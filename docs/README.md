# srcVisual Documentation

Start with the project [README](../README.md) for srcVisual's purpose, current
application, relationship to srcMove, and hosted-service vision.

## Product behavior and design

- [Application rules](Rules.md): canonical backend/frontend data invariants,
  supported srcDiff shapes, metadata preservation, and package boundaries
- [Artifact-backed visualization architecture](artifact-architecture.md):
  current artifact, projection, source-hunk, execution, and lifecycle design,
  plus the migration record
- [Repository history browser](history-browser.md): current srcMove/srcVisual
  ownership boundary, durable run workflow, API, and deliberate limits
- [Frontend color guide](../frontend/docs/color-guide.md): visual language for
  diffs, revisions, interactions, and move relationships
- [BigMoveBench Type-3 review](bigmovebench-review.md): portable review bundle,
  import workflow, and preserved per-case evidence

The application rules and implementation are authoritative when planning notes
disagree with current behavior.

## Development

- [Debugging and tests](Debugging.md): backend and frontend test commands,
  temporary-file controls, and debugger entry points
- [Programming style](ProgrammingStyle.md): Python module boundaries, naming,
  validation, and clarity conventions
- [`pyproject.toml`](../pyproject.toml): Python version, dependencies, and backend
  command entry points
- [`frontend/package.json`](../frontend/package.json): frontend build and test
  commands
- [`Dockerfile`](../Dockerfile) and [`compose.yaml`](../compose.yaml): packaged
  application build and runtime configuration

When srcVisual is checked out inside SrcMLBuildTemplate, use the parent
workspace's Docker environment for builds, tests, and native srcML-toolchain
diagnostics rather than installing the toolchain directly on macOS.

## Non-authoritative planning

- [Backlog](backlog.md): evidence-gated candidate improvements; entries do not
  establish current behavior

Update or retire backlog entries when work is implemented. Verified behavior
belongs in the project README or the most specific architecture document.

## Guidance for AI agents

- [Repository agent guidance](../AGENTS.md): required reading, environment,
  commands, editing constraints, documentation rules, and security boundaries

AI agents use the same product and development documentation as human
contributors. `AGENTS.md` contains operating instructions, not a separate
description of srcVisual.
