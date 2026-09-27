# Repository History Browser

Status: implemented local workflow.

The History input mode browses an existing `srcmove-history` analysis and
opens one selected adjacent-commit comparison in srcVisual. It is a local,
Docker-oriented integration for one operator-configured repository, not a
general filesystem browser or hosted repository-analysis service.

## Ownership boundary

- srcMove owns repository selection, pair numbering, frozen analysis
  configuration and tools, compact move evidence, comparison execution, and
  repository-local state below `.srcmove`.
- srcVisual owns the durable run queue, progress presentation, immutable
  visualization artifacts, and frontend projections.
- srcVisual uses the versioned `srcmove-history` JSON interface. It does not
  query srcMove's private SQLite database.
- Browser requests may select only a positive pair number. They cannot supply
  repository paths, executables, Git revisions, or shell commands.

The configured source worktree is mounted read-only. The local Compose setup
grants narrowly scoped write access to `.git` and `.srcmove` because
`srcmove-history compare` records operation state and saved comparisons there.

## Current workflow

The backend uses these public srcMove operations:

- `status --format json` for analysis state and totals;
- `list --format json` for bounded `all`, `moves`, or `failed` pair pages;
- `show PAIR --format json` for compact pair evidence and the canonical
  `pair_fingerprint`; and
- `compare --pair PAIR --save all --format json` to regenerate complete XML
  with the analysis's admitted tool copies.

The status, list, and detail browsing operations are read-only. Visualization
delegates the necessary repository-local writes to srcMove and is asynchronous:

1. `POST /api/history/pairs/{pair_number}/runs` creates or reuses a durable
   history-visualization run.
2. The dedicated `history-worker` service claims queued work and asks
   `srcmove-history` to materialize the pair.
3. The worker confines the returned `srcmove.xml` and optional `results.json`
   to `.srcmove/comparisons`, then publishes an immutable srcVisual artifact.
4. The frontend follows progress through reconnectable server-sent events,
   keeps status polling as the authoritative fallback, supports cancellation,
   and opens the completed artifact.

Queued or running work with the same fingerprint is reused. A matching
completed artifact is reused only after its manifest, checksums, and index
validate. The fingerprint combines srcMove's versioned pair identity with the
srcVisual artifact schema and artifact-building configuration.

## HTTP surface

```text
GET  /api/history/status
GET  /api/history/pairs
GET  /api/history/pairs/{pair_number}
POST /api/history/pairs/{pair_number}/runs
GET  /api/runs/{run_id}
GET  /api/runs/{run_id}/events
POST /api/runs/{run_id}/cancel
```

The pair-list endpoint accepts bounded pagination and the `all`, `moves`, and
`failed` selections. Run events use durable per-run sequence numbers and the
standard `Last-Event-ID` header for reconnection.

## Deliberate limits

- srcVisual does not start or extend a repository-wide history analysis.
- Normal history storage retains compact evidence rather than complete XML for
  every pair; selected pairs are regenerated on demand.
- History execution requires the separately running `history-worker` service.
- Public untrusted deployment requires separate authorization, sandboxing,
  resource limits, and threat-model work.

The artifact and run contracts are described in
[Artifact-backed visualization architecture](artifact-architecture.md).
