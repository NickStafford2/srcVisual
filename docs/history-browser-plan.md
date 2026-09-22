# Repository History Browser Plan

This is a planning document, not a description of implemented behavior.

## Goal

Let srcVisual browse an existing `srcmove-history` analysis and visualize one
selected adjacent-commit comparison without writing to the analyzed repository,
its `.git` directory, or its `.srcmove` state.

The first useful version is local and Docker-based. It targets one repository
configured by the person running srcVisual; it is not a public repository
hosting service or a general server-side filesystem browser.

## Existing Boundaries

- `srcMove` owns history selection, stable commit-pair numbering, frozen
  configuration and tools, compact move evidence, and the `.srcmove` database.
- `srcVisual` owns presentation of annotated srcDiff XML. Its existing pipeline
  already accepts srcMove-annotated XML without rerunning srcDiff or srcMove.
- Normal history analysis intentionally retains compact evidence rather than
  complete srcDiff or srcMove XML. Full visualization therefore requires
  materializing one selected pair from Git objects.
- The existing `srcmove-history compare` command is not a read-only web bridge:
  it writes operation state, scratch data, and saved artifacts under `.srcmove`.

## Options Considered

| Option | Advantage | Problem | Decision |
| --- | --- | --- | --- |
| Read SQLite directly in srcVisual | Few processes and quick initial code | Couples srcVisual to a private schema and duplicates srcMove query semantics | Reject |
| Use `srcmove-history status`, `list`, and `show` JSON | Uses versioned public output and keeps history semantics in srcMove | Requires packaging the history CLI in the image | Use for browsing |
| Invoke the existing `compare --pair` command | Already regenerates complete artifacts | Mutates `.srcmove` and requires a writable repository mount | Reject for the web path |
| Add a read-only pair-materialization interface to srcMove | Preserves frozen inputs and can write only to caller-owned temporary storage | Requires a small, tested srcMove feature | Use for visualization |
| Rerun the selected SHAs with srcVisual's current binaries | Avoids a srcMove interface change | Can disagree with the frozen historical analysis | Reject |
| Retain full XML for every analyzed pair | Makes later viewing immediate | Greatly increases storage and changes the compact-history contract | Defer unless evidence shows a need |

## Recommended Architecture

Docker bind-mounts one configured repository read-only. The browser does not
submit arbitrary host paths. srcVisual calls versioned `srcmove-history` JSON
commands through a small backend adapter for status, bounded pair pages, and
pair details. srcVisual does not issue SQL against `analysis.sqlite3`.

For a selected pair, srcMove should expose a read-only materialization operation
that:

1. reads the immutable pair, configuration, and admitted tool observations;
2. reads the required Git objects from the repository;
3. creates all scratch files and outputs beneath a caller-provided temporary
   directory;
4. does not create locks, activity records, comparison directories, database
   rows, Git refs, or any other repository-local state; and
5. returns a versioned result identifying the generated annotated XML and any
   reproducibility error.

The backend then passes that annotated XML through the existing srcVisual
payload builder. The current upload, paste, and example flows remain available.

## Delivery Phases

### 1. Read-only history browsing

- Package the `srcmove_history` Python package, its command wrapper, and Git in
  the srcVisual runtime image.
- Add an explicit history-repository setting and a read-only Compose mount.
- Add backend adapters and endpoints for analysis status, paginated pair lists,
  and one pair's compact evidence.
- Add a History input mode with analysis summary, filters, pair selection, and
  clear empty/error states.
- Initially show stable pair numbers, abbreviated commit IDs, status, path
  counts, move counts, and timings. Commit subjects and timestamps are deferred
  until srcMove freezes them or an explicitly availability-sensitive Git lookup
  is designed.

### 2. Visualize a selected pair

- Add the read-only materialization contract and tests in srcMove.
- Package and invoke that contract from the srcVisual backend using only its
  temporary directory.
- Feed the generated srcMove-annotated XML into the existing visualization
  pipeline and label the view with its pair number and commit IDs.
- Detect and report missing Git objects, incompatible admitted tools, failed
  historical pairs, timeouts, and regeneration mismatches without changing the
  stored analysis.

### 3. Usability and thesis-oriented views

- Add navigation between adjacent pairs and useful filters such as moves only,
  failed pairs, and match kind.
- Add aggregate charts only after the browsing workflow establishes which
  measures answer a real research question.
- Consider frozen commit metadata, exportable figures/tables, and cached
  temporary renderings as separate, evidence-driven improvements.

Running or extending history analysis from the srcVisual UI is intentionally
outside these phases. It has different safety, progress, and resource-control
requirements.

## Acceptance Criteria for the First End-to-End Milestone

- A user can start srcVisual with Docker and point it at one existing analyzed
  repository through configuration, not browser-supplied filesystem paths.
- The repository is mounted read-only, and an automated check demonstrates
  that browsing and visualization do not change its worktree, `.git`, or
  `.srcmove` contents.
- The UI can page through stable history pairs, inspect compact move evidence,
  and open a completed pair in the existing synchronized source, tree, XML,
  and move views.
- Existing example, paste, and upload workflows continue to pass their tests.
- Backend and frontend tests cover invalid state, concurrent analysis reads,
  missing Git objects, failed pairs, and materialization timeout/failure.

## First Implementation Slice

Implement Phase 1 against a fixture analysis before changing pair execution.
This validates the Docker mount, packaged CLI, versioned JSON adapter, API
shape, and frontend navigation while keeping the active srcMove checkout
read-only. Once that seam is proven, design the smallest srcMove
pair-materialization API needed by Phase 2.
