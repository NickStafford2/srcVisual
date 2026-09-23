# srcVisual

srcVisual is the visualization companion to `srcMove`, a cross-file move
detector developed as a master's thesis project. Move annotations are difficult
to evaluate by reading XML alone, so srcVisual presents srcDiff structure,
source code, and detected moves together in a code-editor-like interface.

## Current application

srcVisual consists of a Python/Flask backend and a React frontend. It can accept
uploaded or pasted srcDiff XML, including XML that has already been annotated
by srcMove. In its Docker development configuration, it can also browse the
existing `srcmove-history` analysis mounted read-only from the configured
repository.

The backend:

- queries history status, bounded commit-pair pages, and compact pair evidence
  through srcMove's versioned JSON command interface
- extracts the original and modified source with `archive_reader`
- adds position information with `srcdiff --position` when needed
- adds move annotations with `srcMove` when needed
- builds one normalized payload containing annotated XML, move results, file
  metadata, source code, and tree data

The frontend uses that payload to keep its XML, tree, source-code, diff, and
move views synchronized. This is especially valuable for moves across files,
where the matching deletion and insertion cannot be understood in one local
source view.

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
repository read-only for history browsing; change both the volume source and
`SRCVISUAL_HISTORY_REPOSITORY` together to browse another analyzed repository.

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
