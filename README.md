# srcVisual

srcVisual is the visualization companion to `srcMove`, a cross-file move
detector developed as a master's thesis project. Move annotations are difficult
to evaluate by reading XML alone, so srcVisual presents srcDiff structure,
source code, and detected moves together in a code-editor-like interface.

## Current application

srcVisual consists of a Python/Flask backend and a React frontend. It can accept
uploaded or pasted srcDiff XML, including XML that has already been annotated
by srcMove. In its Docker development configuration, it can also browse an
existing `srcmove-history` analysis and regenerate a selected pair for the
normal synchronized visualization.

The backend:

- queries history status, bounded commit-pair pages, and compact pair evidence
  through srcMove's versioned JSON command interface
- asks `srcmove-history` to regenerate a selected pair with the analysis's
  admitted tool copies, then renders the resulting annotated XML
- extracts the original and modified source with `archive_reader`
- adds position information with `srcdiff --position` when needed
- adds move annotations with `srcMove` when needed
- atomically publishes an immutable artifact containing normalized annotated
  XML, extracted revision sources, retained move metadata, checksums, and a
  structural SQLite index
- returns a small artifact manifest and loads bounded source and tree
  projections on demand

The frontend keeps its XML, tree, source-code, diff, and move views synchronized
through stable artifact-local identities. It initially loads one file with
three lines of context around changes and moves, represents omitted ranges as
expandable gaps, pages tree children, and fetches complete XML only when its
tab is opened. The old monolithic response and pruning controls remain only as
a temporary compatibility interface.

Important implementation expectations are documented in
[docs/Rules.md](docs/Rules.md).

## Run locally with Docker

On macOS, run srcVisual from the parent workspace directory. Docker builds the
Linux frontend, backend, srcML, srcReader, srcDiff, and srcMove dependencies;
the host does not need native build tools for those projects.

```bash
docker compose -f srcVisual/compose.yaml up --build -d
```

Open <http://127.0.0.1:5000>. The service is bound only to the local machine.
Inspect its status and logs with:

```bash
docker compose -f srcVisual/compose.yaml ps
docker compose -f srcVisual/compose.yaml logs -f
```

Stop and remove the local container with:

```bash
docker compose -f srcVisual/compose.yaml down
```

The image contains a compiled snapshot of the sibling source checkouts at build
time; building it does not edit those checkouts. Re-run the build command after
changing srcVisual or a native dependency such as srcMove. This Compose setup
is currently a production-style local build, not a hot-reload development
server. The checked-in Compose configuration mounts the Notepad++ reference
repository as the one preconfigured analysis target. Its source worktree is
read-only; only its `.git` and `.srcmove` directories are writable so the
`srcmove-history` CLI can manage its own operation state and saved comparison
artifacts. Change the volume sources and `SRCVISUAL_HISTORY_REPOSITORY`
together to use another analyzed repository.

Published visualization artifacts are stored in the named
`srcvisual-artifacts` volume mounted at `/var/lib/srcvisual/artifacts`. They
survive container replacement and ordinary `docker compose down`; removing the
named volume removes them. Durable history run state and ordered progress
events use `runs.sqlite3` in that same volume.

History visualization runs are queued with
`POST /api/history/pairs/{pair_number}/runs` and processed by the dedicated
`history-worker` Compose service. The status polling endpoint is
`GET /api/runs/{run_id}`; durable progress streams from
`GET /api/runs/{run_id}/events`, and `POST /api/runs/{run_id}/cancel` requests
cancellation. The current frontend continues to use the synchronous
compatibility endpoint until its Phase 4 artifact-contract migration.

Run creation derives an internal fingerprint from srcMove's versioned pair
identity plus srcVisual's artifact schema and analysis configuration. A
matching queued or running request follows the existing run (`202`); a valid
completed artifact is returned immediately (`200`). The response field
`reuse` distinguishes `new`, `active-run`, and `artifact`. Missing or corrupt
completed artifacts are never reused and fresh work is queued instead.

## Hosted application vision

The long-term goal is a secure hosted service where users can:

- upload srcDiff XML and inspect its structured differences
- upload srcMove-annotated XML and inspect its moves
- select a GitHub repository and two commits
- let srcVisual obtain both revisions, run srcDiff and srcMove, and visualize
  the resulting cross-file differences and moves

Public hosting is a future goal, not a current security guarantee. The backend
runs native analysis tools and processes user-controlled repositories and XML.
It must be threat-modeled, sandboxed, resource-limited, and hardened before it
is exposed to untrusted public input.
