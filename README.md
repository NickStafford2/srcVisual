# srcDiffVisual

srcDiffVisual is the visualization companion to `srcMove`, a cross-file move
detector developed as a master's thesis project. Move annotations are difficult
to evaluate by reading XML alone, so srcDiffVisual presents srcDiff structure,
source code, and detected moves together in a code-editor-like interface.

## Current application

srcDiffVisual has a Python/Flask backend and a React frontend. It supports four
input workflows:

- load a checked-in example;
- paste or upload srcDiff XML;
- browse saved BigMoveBench runs, fragments, and reported moves, or import a portable review ZIP; or
- browse configured `srcmove-history` analyses and regenerate a selected pair
  with that analysis's admitted tools.

For XML input, the backend extracts both source revisions with
`archive_reader`. It runs `srcdiff --position` only when position annotations
are missing and runs `srcMove` only when move annotations are missing. It then
atomically publishes an immutable artifact containing normalized annotated
XML, extracted sources, retained move metadata, checksums, and a structural
SQLite index.

The frontend loads bounded projections of that artifact. Its Source view lists
changed files as collapsible cards, retrieves source only for expanded files,
and represents omitted ranges as expandable gaps. A dedicated srcDiff sidebar
control independently highlights explicit `diff:common`, `diff:delete`, and
`diff:insert` source regions; unwrapped common source remains neutral. Move
highlighting and connectors remain a separate layer. A diff-only tree collapses
intervening srcML syntax nodes and selecting a region outlines that region, its
diff ancestors, and its direct diff children in Source. Source, XML, the structure
tree, sidebar node inspector, and Move Summary share stable artifact-local identities.
Selecting a moved fragment or connector opens retained srcMove details;
connector visibility and move isolation remain separate controls. The XML view
is loaded only when opened. The application does not infer unavailable
classification or selection evidence from XML-only input.

See [application rules](docs/Rules.md), the
[artifact architecture](docs/artifact-architecture.md), and the
[history-browser contract](docs/history-browser.md) for the canonical details.

## Run locally with Docker

For frontend development, first build the application once using the command
below, then run this from the parent workspace:

```bash
make -C srcDiffVisual dev
```

Open <http://localhost:5173>. React and CSS edits update automatically through
Vite hot reload. The development server runs in Docker and proxies `/api` to
the existing backend, sharing its artifacts and history. The first start
installs frontend dependencies; `make -C srcDiffVisual dev-logs` shows readiness.
After changing frontend dependencies, restart it with `make -C srcDiffVisual
dev-stop` followed by `make -C srcDiffVisual dev` to reinstall from the lockfile.
The stop command stops only the frontend development server.

The following command builds and starts the packaged application at port 5000:

On macOS, run srcDiffVisual from the parent workspace directory. Docker builds the
Linux frontend, backend, srcML, srcReader, srcDiff, and srcMove dependencies;
the host does not need native build tools for those projects.

```bash
docker compose -f srcDiffVisual/compose.yaml up --build -d
```

Open <http://127.0.0.1:5000>. The service is bound only to the local machine.
Inspect its status and logs with:

```bash
docker compose -f srcDiffVisual/compose.yaml ps
docker compose -f srcDiffVisual/compose.yaml logs -f
```

Stop and remove the local container with:

```bash
docker compose -f srcDiffVisual/compose.yaml down
```

The image contains a compiled snapshot of the sibling source checkouts at build
time; building it does not edit those checkouts. In the parent workspace's
evaluation workflow, Compose replaces the packaged srcMove executable with the
incrementally built Linux `srcMove/build/srcMove` binary in both services and
one-off containers. Rebuild the full image after changing srcDiffVisual,
`srcmove_history` Python code, the Dockerfile, or another native dependency.
The canonical commands and checksum-based analysis lifecycle are documented in
the parent workspace's `docs/workspace.md`.
Port 5000 serves the packaged build; port 5173 provides frontend hot reload
through `compose.dev.yaml`. In development, the API source is also mounted with Gunicorn reload.
Python dependency and native dependency edits still require rebuilding the image;
the history worker continues using its packaged code. Outside development,
application changes require rebuilding the packaged application. The checked-in
Compose configuration makes the analyzed Notepad++ and SQLite reference
repositories available in the History selector, with Notepad++ selected by
default. Their source worktrees are read-only; only their `.git` and `.srcmove`
directories are writable so the `srcmove-history` CLI can manage its own
operation state and saved comparison artifacts. Additional repositories must be
mounted into both services and added to the allow-listed
`SRCDIFFVISUAL_HISTORY_REPOSITORIES` JSON configuration.

Published visualization artifacts are stored in the named
`srcdiffvisual-artifacts` volume mounted at `/var/lib/srcdiffvisual/artifacts`. They
survive container replacement and ordinary `docker compose down`; removing the
named volume removes them. Durable history run state and ordered progress
events use `runs.sqlite3` in that same volume.

Inspect artifact count, disk use, integrity, history-run protection, and a
dry-run retention plan without deleting data:

```bash
docker compose -f srcDiffVisual/compose.yaml run --rm srcdiffvisual artifact-inventory \
  --max-artifacts 100 --max-bytes 10737418240 --max-age-days 90
```

All retention limits are optional. The default command is read-only and emits
a `plan_id`. To apply that exact reviewed plan, repeat the same policy with
`--apply-plan PLAN_ID`. Collection takes an exclusive lock, rebuilds the
inventory, rechecks history-run references, and refuses stale plans. Applying
a plan permanently deletes its candidates; automatic collection is not
enabled.

History visualization runs are queued with
`POST /api/history/pairs/{pair_number}/runs` and processed by the dedicated
`history-worker` Compose service. The status polling endpoint is
`GET /api/runs/{run_id}`; durable progress streams from
`GET /api/runs/{run_id}/events`, and `POST /api/runs/{run_id}/cancel` requests
cancellation. The history frontend now creates durable runs, shows their
reconnectable progress stream, retains authoritative status polling, supports
cancellation, and opens the resulting artifact. The synchronous history
visualization endpoint has been removed.

Run creation derives an internal fingerprint from srcMove's versioned pair
identity plus srcDiffVisual's artifact schema and analysis configuration. A
matching queued or running request follows the existing run (`202`); a valid
completed artifact is returned immediately (`200`). The response field
`reuse` distinguishes `new`, `active-run`, and `artifact`. Missing or corrupt
completed artifacts are never reused and fresh work is queued instead.

## Current limitations

- The local history browser can choose only repositories explicitly mounted and
  configured when the services start; it cannot browse arbitrary paths or start
  a full analysis.
- Uploaded XML is processed synchronously. Its optional progress stream uses a
  process-local broker, so a multi-worker deployment can route the upload and
  progress connection to different workers. Durable history progress does not
  have this limitation.
- Artifact retention is manual. Automatic collection is not enabled.
- The application is not hardened for public, untrusted input.

## Hosted application vision

The long-term goal is a secure hosted service where users can:

- upload srcDiff XML and inspect its structured differences
- upload srcMove-annotated XML and inspect its moves
- select a GitHub repository and two commits
- let srcDiffVisual obtain both revisions, run srcDiff and srcMove, and visualize
  the resulting cross-file differences and moves

Public hosting is a future goal, not a current security guarantee. The backend
runs native analysis tools and processes user-controlled repositories and XML.
It must be threat-modeled, sandboxed, resource-limited, and hardened before it
is exposed to untrusted public input.
