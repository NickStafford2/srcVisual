# srcVisual

srcVisual is the visualization companion to `srcMove`, a cross-file move
detector developed as a master's thesis project. Move annotations are difficult
to evaluate by reading XML alone, so srcVisual presents srcDiff structure,
source code, and detected moves together in a code-editor-like interface.

## Current application

srcVisual consists of a Python/Flask backend and a React frontend. It can accept
uploaded or pasted srcDiff XML, including XML that has already been annotated
by srcMove.

The backend:

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
