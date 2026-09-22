# srcVisual Documentation

Start with the project [README](../README.md) for srcVisual's purpose, current
application, relationship to srcMove, and hosted-service vision.

## Product behavior and design

- [Application rules](Rules.md): canonical backend/frontend data invariants,
  supported srcDiff shapes, metadata preservation, and package boundaries
- [Frontend color guide](../frontend/docs/color-guide.md): visual language for
  diffs, revisions, interactions, and move relationships

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

## Planning and non-authoritative notes

- [Repository history browser plan](history-browser-plan.md): evaluated
  integration options, recommended read-only boundary, delivery phases, and
  acceptance criteria
- [Todo](todo.md): candidate backend and frontend work; entries may be stale and
  do not establish current behavior
- [Notes](notes.md): exploratory interface and srcMove-integration ideas

Plans and notes should be updated or retired when work is implemented. Verified
behavior belongs in the project README or application rules.

## Guidance for AI agents

- [Repository agent guidance](../AGENTS.md): required reading, environment,
  commands, editing constraints, documentation rules, and security boundaries

AI agents use the same product and development documentation as human
contributors. `AGENTS.md` contains operating instructions, not a separate
description of srcVisual.
