# Repository History Browser

Status: implemented local workflow.

The History input mode extends existing `srcmove-history` analyses and opens
one selected adjacent-commit comparison in srcDiffVisual. It is a local,
Docker-oriented integration for operator-configured repositories, not a general
filesystem browser or hosted repository-analysis service.

## Ownership boundary

- srcMove owns repository analysis, pair numbering, frozen analysis
  configuration and tools, compact move evidence, comparison execution, and
  repository-local state below `.srcmove`.
- srcDiffVisual owns the durable run queue, progress presentation, immutable
  visualization artifacts, and frontend projections.
- srcDiffVisual uses the versioned `srcmove-history` JSON interface. It does not
  query srcMove's private SQLite database.
- Browser requests may select an allow-listed repository ID and a positive pair
  number. They cannot supply repository paths, executables, Git revisions, or
  shell commands.

Configured source worktrees are mounted read-only. The local Compose setup
grants narrowly scoped write access to each `.git` and `.srcmove` because
`srcmove-history compare` records operation state and saved comparisons there.

## Current workflow

The backend uses these public srcMove operations:

- `status --format json` for analysis state and totals;
- `list --format json` for bounded `all`, `moves`, or `failed` pair pages;
- `show PAIR --format json` for compact pair evidence and the canonical
  `pair_fingerprint`; and
- `compare --pair PAIR --save all --format json` to regenerate complete XML
  with the analysis's admitted tool copies.

Status responses use schema 3 and `moves.by_content_relationship`. Pair list,
pair detail, and comparison responses use schema 2. The srcMove history database
is schema 7; srcDiffVisual delegates database admission to the CLI. Rebuild the
application/history worker and start a fresh analysis with current tools; preserve
older `.srcmove` directories as evidence. Do not resume incompatible analyses.
Compact move evidence uses `content_relationship`; results.json requires schema 2.

The status, list, and detail browsing operations are read-only. Visualization
delegates the necessary repository-local writes to srcMove and is asynchronous:

1. `POST /api/history/pairs/{pair_number}/runs` creates or reuses a durable
   history-visualization run.
2. The dedicated `history-worker` service claims queued work and asks
   `srcmove-history` to materialize the pair.
3. The worker confines the returned `srcmove.xml` and optional `results.json`
   to `.srcmove/comparisons`, then publishes an immutable srcDiffVisual artifact.
4. The frontend follows progress through reconnectable server-sent events,
   keeps status polling as the authoritative fallback, supports cancellation,
   and opens the completed artifact.

Queued or running work with the same fingerprint is reused. A matching
completed artifact is reused only after its manifest, checksums, and index
validate. The fingerprint combines srcMove's versioned pair identity with the
srcDiffVisual artifact schema and artifact-building configuration.

## Incremental analysis and thesis export

Use **Analyze 100 more** (or change the count) to queue an extension. The worker
uses an absolute coverage target, so duplicate requests reuse the active job.
The queue belongs to srcDiffVisual, in its run database. Progress refreshes the
covered, successfully compared, no-source, and failed counts. Pair numbers stay
stable as coverage grows. **Show more existing results** only paginates saved
results; it does not execute analysis. Search applies to the loaded results.
Previous/Next controls traverse loaded pairs while reviewing an artifact.

Completed extensions automatically create a srcMove evidence snapshot.
**Save thesis snapshot** also creates/downloads the current snapshot and, when
`SRCDIFFVISUAL_HISTORY_EXPORT_ROOT` is configured, publishes identical bytes to
its repository subdirectory. Local Compose mounts the private thesis data
folder there. Snapshots cannot run concurrently with an analysis writer.
See the [srcMove snapshot contract](../../srcMove/srcmove_history/docs/runtime.md#evidence-snapshots).

Regenerated comparisons must match both compact stored detections and the
original results JSON checksum before they can be saved or visualized. Artifacts
record the frozen analysis definition, pair identity, and admitted binary
checksums. A snapshot made after reviewing pairs includes their verified XML;
one made before review contains compact observations only. Review judgments
remain separate from detector output.

## HTTP surface

```text
GET  /api/history/extensions
POST /api/history/extensions
POST /api/history/snapshot
GET  /api/history/status
GET  /api/history/repositories
GET  /api/history/pairs
GET  /api/history/pairs/{pair_number}
POST /api/history/pairs/{pair_number}/runs
GET  /api/runs/{run_id}
GET  /api/runs/{run_id}/events
POST /api/runs/{run_id}/cancel
```

The status, pair-list, pair-detail, and run-creation endpoints accept a
configured `repository` ID. The pair-list endpoint also accepts bounded
pagination and the `all`, `moves`, and `failed` selections. Durable run records
retain the repository ID so the worker cannot accidentally execute a queued
pair against a different repository. Run events use durable per-run sequence
numbers and the standard `Last-Event-ID` header for reconnection.

## Deliberate limits

- New analyses and recreation are operator actions through the workspace
  commands; browser extensions use the existing frozen definition.
- Normal history storage retains compact evidence rather than complete XML for
  every pair; selected pairs are regenerated on demand.
- History execution requires the separately running `history-worker` service.
- Public untrusted deployment requires separate authorization, sandboxing,
  resource limits, and threat-model work.

The artifact and run contracts are described in
[Artifact-backed visualization architecture](artifact-architecture.md).
