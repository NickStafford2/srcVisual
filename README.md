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

For XML input, the backend extracts both revisions with `archive_reader`, adds
missing positions with `srcdiff --position`, and runs `srcMove` only when move
annotations are missing. It publishes an immutable artifact containing the XML,
source, move metadata, checksums and a structural index.

The interface provides a searchable file tree, lazy source and XML views,
srcDiff region highlighting, move connectors, a move summary and retained
producer results. All panes refer to the same artifact. Missing classification
or selection evidence is never inferred from XML alone.

See [application rules](docs/Rules.md), the
[artifact architecture](docs/artifact-architecture.md), and the
[history-browser contract](docs/history-browser.md) for the canonical details.

## Run locally with Docker

Use the parent [workspace recovery guide](../docs/workspace.md#recover-on-another-mac)
to restore sibling source checkouts. Install Git, Python 3.9+ and Docker Desktop
on the host; native builds, Python dependencies and frontend dependencies run
in Docker. Run the following from the **parent workspace root**.

Build the native tools, then preview and prepare the host bind sources:

```bash
make build
python3 srcDiffVisual/scripts/prepare_workspace.py
python3 srcDiffVisual/scripts/prepare_workspace.py --apply
```

Preparation reads the [reference registry and recovery inventory](../srcMove/reference-repositories/README.md),
clones only missing history repositories, and creates empty analysis/result
mount directories. Existing clones are left unchanged. Full histories require
substantial time and storage (the previous reference collection occupied about
17 GB); the preview reports current free space. Review interrupted clones before
retrying. `make -C srcDiffVisual prepare` also previews; add `APPLY=1` to apply.

Prepare before Compose: otherwise missing bind sources can become invalid
`.git` or executable directories. The application image build alone does not
create the required host `srcMove/build/srcMove`. Linux uses `--no-checkout` to
avoid Mac filename collisions; history reads committed Git objects. A complete
Linux source worktree needs a case-sensitive filesystem.

Build and start the packaged application:

```bash
docker compose -f srcDiffVisual/compose.yaml up --build -d
docker compose -f srcDiffVisual/compose.yaml ps
docker compose -f srcDiffVisual/compose.yaml logs -f
```

Open <http://127.0.0.1:5000>. Examples and XML uploads work without old analysis
state. The History selector lists Notepad++, SQLite, OpenCV and two Linux scopes;
empty `.srcmove` directories are mount preparation, not completed analyses.
To create a fresh analysis, use the parent
[history workflow](../docs/workspace.md#macos-development-model), for example
`make history-new REPO=notepadpp COUNT=100`. This rebuilds and starts the viewer
as well. Both Linux entries share one clone; `.srcmove` holds the scoped analysis
and `.srcmove-whole` holds the whole-repository analysis. Source mounts are
read-only; Git and analysis state are writable. Additional repositories require
mounts and allow-list entries in both Compose services.

For frontend hot reload and backend Python reload:

```bash
make -C srcDiffVisual dev
make -C srcDiffVisual dev-logs
```

Open <http://localhost:5173>. The first start installs frontend dependencies.
After changing frontend dependencies, use `make -C srcDiffVisual dev-stop`
then `make -C srcDiffVisual dev` to reinstall from the lockfile. `dev-stop`
stops only the frontend. Rebuild the image after Python dependencies, native
dependencies, or packaged application code change. The history worker uses
packaged viewer code. See [debugging and tests](docs/Debugging.md) for checks and
refreshing mounts after rebuilding srcMove.

Stop the services with:

```bash
docker compose -f srcDiffVisual/compose.yaml down
```

The named `srcdiffvisual-artifacts` volume preserves visualization artifacts and
`runs.sqlite3` across ordinary `down` and container replacement. Removing that
volume removes its contents. Reference `.srcmove*` state and private thesis
exports live in their host directories; retained thesis evidence belongs in the
private repository. Fresh analyses and artifacts can be regenerated. See
[artifact inspection](docs/Debugging.md#artifact-inspection) for manual retention
and the [history-browser contract](docs/history-browser.md) for run APIs.

## Repository contents

| Path | Purpose |
| --- | --- |
| `srcdiffvisual/` | Backend, artifact storage and history worker |
| `frontend/` | React interface and locked Node dependencies |
| `examples/`, `tests/` | Review examples and automated checks |
| `scripts/` | Workspace preparation and review utilities |
| `docs/` | [Canonical behavior and development guides](docs/README.md) |
| `Dockerfile`, `compose*.yaml`, `Makefile` | Linux build, local services and checks |

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

A future hosted service could compare arbitrary GitHub revisions and visualize
their moves. Public hosting requires sandboxing, resource limits and a threat
model for native tools and user-controlled inputs.
