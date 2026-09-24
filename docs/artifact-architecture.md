# Artifact-Backed Visualization Architecture

Status: accepted architecture and implementation plan.

Date: 2026-09-23

Repository: `srcVisual`

## Goal

Replace the monolithic visualization response and destructive pruning pipeline
with an immutable artifact and bounded, lazily requested projections.

The source view should behave like a large, aligned GitHub-style diff:

- ordinary changes and move endpoints are visible by default;
- moves are visually emphasized;
- three lines of surrounding context are initially shown;
- omitted source is represented by explicit expandable gaps;
- a user can reveal any source range without rerunning srcDiff or srcMove;
- large comparisons do not require downloading or rendering every source line,
  tree node, and XML line at once.

srcVisual remains a GUI for srcDiff and srcMove. The final normalized annotated
XML is the semantic source of truth; source, tree, XML, diff, and move views are
projections of the same immutable artifact.

## Accepted Product Decisions

1. The source view uses aligned display rows, not two unrelated source panes.
2. The default focus is ordinary changes plus moves, with moves emphasized and
   three initial context lines.
3. A moves-only focus remains useful for srcMove research, but it is a view
   profile rather than a destructive pruning mode.
4. Move connectors are drawn only when both endpoints are rendered. Endpoint
   badges and navigation remain available when an endpoint is collapsed,
   virtualized, or in another file.
5. Artifacts survive worker restarts and Docker container replacement through
   a dedicated, bounded srcVisual storage volume.
6. Complete normalized XML is the primary XML view and export. Filtered XML is
   deferred until a concrete user or research workflow requires it.
7. Move provenance is preserved in the artifact. The first redesigned UI does
   not need to expose every provenance distinction unless it helps the active
   research workflow.
8. Browser and URL state are sufficient for views. There are no server-side
   view sessions.
9. Character-precise move highlighting and the existing SVG move relationship
   visualization are essential srcMove inspection behavior. The artifact UI
   were restored before the legacy renderer was removed; a line badge alone is
   not sufficient.
10. Moves retain the established yellow/amber semantic color. Unchanged source
    uses a neutral near-black background; blue is reserved for interaction or
    navigation and must not imply that unchanged source is modified.

## Why the Legacy Model Had to Change

The legacy `build_visualization_payload()` extracted complete sources, built a
complete tree and payload, validated them, and then reconstructed XML, sources,
trees, spans, and move results after pruning. The frontend received all of
those representations in one `VisualizeResponse`.

History visualization forced `move-only` pruning. This made a large response
manageable but removed most surrounding source, producing nearly blank source
files that could not be expanded without another analysis request.

The measured Notepad++ history pair 13 illustrates the mismatch:

- the retained annotated XML is about 6.6 MB and contains 29 units;
- a move-focused response is about 166 KiB;
- the unpruned monolithic response is about 216 MB;
- regeneration and move-focused visualization took about 48 seconds;
- an unpruned request took roughly two minutes.

The primary delivery problem is duplicated source, tree, XML, and JSON data,
not the canonical XML by itself.

Other verified constraints:

- current node IDs are positional XML paths and are not stable if units or
  siblings are removed or reordered;
- current SSE progress queues live in one Flask worker while Gunicorn runs
  multiple workers;
- every source line is rendered into the DOM;
- move connector geometry depends on live DOM elements;
- history materialization currently retains the XML path but discards useful
  `results.json` classification metadata;
- retained history XML can contain absolute temporary scratch paths, which
  must not be exposed by artifact XML or manifests;
- Compose has no persistent writable location owned by srcVisual.

## Phase 0 Baseline

The baseline was reproduced before implementation work began.

### Payload composition

The unpruned pair 13 payload was built from the retained annotated XML using
the normal `include_skipped_tags=false` behavior. Compact JSON encoding
measured:

| Component | Size |
| --- | ---: |
| Complete payload | 215,963,495 bytes |
| Expanded trees | 206,603,078 bytes |
| Annotated XML string | 6,691,115 bytes |
| Revision 0 source | 1,225,679 bytes |
| Revision 1 source | 1,229,108 bytes |
| Move results | 7,575 bytes |
| File metadata | 5,314 bytes |

The payload contained 29 files and 296,000 tree nodes and took 74.9–78.1
seconds to construct in repeated packaged-Docker measurements. Compact JSON
encoding took another 2.9 seconds. Expanded tree JSON accounts for about 96%
of the response. With skipped tags included, the pipeline avoids its
filtered-document rebuild and produced 183,259,780 bytes in 44.5 seconds. The
counterintuitive difference confirms that rebuilding the filtered XML, source,
spans, and trees is itself a major cost.

The largest individual trees were:

| File | Nodes | Encoded tree size |
| --- | ---: | ---: |
| `scintilla/src/Editor.cxx` | 74,511 | 53,008,313 bytes |
| `scintilla/src/EditView.cxx` | 31,326 | 24,020,192 bytes |
| `scintilla/win32/ScintillaWin.cxx` | 30,179 | 20,209,285 bytes |
| `scintilla/src/Document.cxx` | 28,591 | 19,754,672 bytes |
| `lexilla/lexers/LexHTML.cxx` | 20,352 | 14,841,892 bytes |

This confirms that neither a forest-wide response nor an unconditional
whole-file tree response is safe. The first artifact UI needs bounded tree
projections with explicit unloaded-child counts. The complete XML may still be
loaded on demand because its measured size is much smaller.

For comparison, the current `move-only` reconstruction produced 169,552 bytes,
4 files, and 225 tree nodes, but still took 34.2 seconds. Its small delivery
size therefore comes from destructively discarding data after most canonical
processing has already happened; it is not an adequate interactive expansion
model.

These historical baseline values were produced by the earlier monolithic
measurement implementation and are retained here rather than keeping an
executable dependency on the compatibility payload. The current command
measures artifact construction, persisted component sizes, and the manifest,
XML, focused-source, and bounded-tree projections:

```bash
python scripts/measure_visualization_payload.py <annotated-xml> \
  --focus changes-and-moves --tree-node-limit 500
```

It uses a temporary artifact store by default. Pass `--artifact-root` to retain
the measured artifact for inspection.

### Test baseline

The initial backend suite reported 114 passing and 3 failing tests:

- one end-to-end test refers to a srcMove fixture directory that no longer
  exists in the current workspace;
- one end-to-end example expects a move that the packaged native toolchain no
  longer reports, so the example and admitted tool behavior must be reconciled;
- one validation-disabled unit test supplies a partial tree stub without the
  `children` field now required by payload instrumentation.

The obsolete function-content example and its dedicated expectation were
removed after confirming that current srcMove requires complete statements as
move candidates. The missing external fixture dependency was replaced with
assertions against the current checked-in `to_new_file` example, and the
validation-disabled unit-test stub was brought up to the tree contract.

The initial frontend suite reported 22 passing and 7 failing tests. Six
failures shared one root cause: `TreeNodeLineBadges.tsx` and
`treeNodeLineBadges.ts` differed only by case, so case-insensitive macOS module
resolution imported the non-component module into `TreeNodeRow`. Renaming the
private helper removed the collision. The remaining progress-log assertion
raced the asynchronous terminal event and now waits for that event.

After these baseline repairs, all 115 backend tests and all 29 frontend tests
pass, and the production frontend build succeeds. This clean baseline is the
safety net for the artifact migration.

## Terminology and Ownership

### Run

A run is one potentially long srcDiff/srcMove or history-materialization
execution. It owns:

- queued, running, completed, failed, and cancelled status;
- durable, ordered progress events;
- cancellation state and process-group termination;
- diagnostics safe to show to the user;
- the resulting artifact ID after successful publication.

History execution continues to belong to srcMove's versioned CLI. srcVisual
does not query srcMove's private database or accept repository paths and shell
commands from the browser.

### Artifact

An artifact is an immutable, backend-owned representation of one completed
visualization input. It survives web-worker restarts and container replacement.

An artifact contains:

- normalized final annotated XML;
- extracted source for both revisions;
- file metadata and line offsets;
- structural nodes and stable artifact-local identities;
- diff regions and move endpoints;
- source and XML spans;
- available srcMove result metadata;
- tool, configuration, input, and history provenance;
- integrity checksums and an artifact schema version.

For history inputs, srcVisual ingests both the final `srcmove.xml` and its
`results.json` when available. XML-only uploads use explicit unknown values for
metadata that cannot be reconstructed; they do not fabricate classifications.

### View

A view is the browser's projection of an artifact:

- selected file, move, or node;
- active source focus profile;
- expanded source gaps;
- active tab;
- tree expansion and navigation state.

The selected artifact, file, tab, focus profile, and primary selection may be
encoded in the URL. Expanded gaps and transient highlights can remain ordinary
browser state.

## Artifact Storage

Each published artifact is a directory owned by srcVisual:

```text
artifacts/<opaque-artifact-id>/
  artifact.json
  annotated.xml
  sources/
    <file-id>/
      revision-0.txt
      revision-1.txt
  index.sqlite
```

`artifact.json` records the schema, provenance, checksums, capabilities, and
safe display metadata. `index.sqlite` is a srcVisual-owned immutable sidecar;
it does not alter or depend on srcMove's private SQLite schema.

Artifact creation is atomic:

1. write to a staging directory;
2. normalize transient metadata;
3. extract sources and build indexes;
4. validate XML, sources, spans, identities, and checksums;
5. write the final manifest;
6. atomically rename the staging directory into the published store.

Failed staging data is cleaned up. Readers never observe a partial artifact.

Normalization is narrow and provenance-aware. It removes or replaces only
backend-generated temporary root metadata such as scratch-directory `url`
values. It preserves user-supplied unit filenames, element order, annotations,
and source content. The manifest records the pre-normalization input checksum
and the published XML checksum so normalization remains auditable.

Artifact and run failure semantics are explicit:

- a run becomes `completed` only after its artifact is atomically published;
- a failed or cancelled run has no artifact ID;
- cancelling a completed run does not delete its artifact;
- published artifact files never change in place;
- a missing artifact returns not found rather than recreating it implicitly;
- a corrupt or schema-incompatible artifact is quarantined and reported as an
  integrity error rather than partially served;
- failed reuse validation starts a new run and does not repair an artifact in
  place;
- projection failure does not invalidate an otherwise valid artifact;
- cleanup never removes an artifact with an active reader lease or run
  reference.

The external artifact ID is an opaque random identifier. A separate internal
fingerprint supports reuse and duplicate-work suppression. The fingerprint
includes relevant input checksums, admitted tool identities, analysis
configuration, and artifact schema version. An artifact ID is an identifier,
not an authorization mechanism.

The deliberate source-file copies support bounded line reads without reparsing
XML. srcVisual does not copy both srcDiff and srcMove documents when the final
annotated XML is sufficient.

## Stable Identity

Positional paths such as `/src:unit[2]/function[3]` remain useful descriptive
metadata, but they are not primary identifiers.

Canonical indexing assigns immutable artifact-local IDs:

- `file_id` identifies one logical file pair;
- `node_id` identifies one canonical XML/tree node;
- `region_id` identifies one diff or move region;
- `move_id` preserves the producer's move ID and records its provenance.

IDs are assigned once while indexing the canonical artifact. Projections refer
to those IDs and never derive new IDs from filtered data. Optional or skipped
tree tags are projection policy and do not change canonical identities.

## Source Projection Model

Source delivery uses aligned blocks:

```text
SourceProjection
  artifact_id
  file_id
  focus_profile
  blocks
    hunk
      left source range
      right source range
      aligned display rows
      diff, node, and move anchors
    gap
      hidden left range and count
      hidden right range and count
```

The contract shape is intentionally explicit rather than encoding gaps as
blank lines:

```text
HunkBlock
  block_id
  left:  { start_line, end_line }
  right: { start_line, end_line }
  rows[]
    kind: context | delete | insert | replace
    left:  { line_number, text, anchors[] } | null
    right: { line_number, text, anchors[] } | null

GapBlock
  block_id
  left:  { start_line, end_line, line_count }
  right: { start_line, end_line, line_count }
```

Source anchors include revision-local start and end line/column coordinates,
clipped to the returned source range when necessary. The frontend uses those
coordinates to split lines into semantic inline fragments. Move highlighting
therefore marks the exact moved characters rather than tinting only the whole
line or appending a generic badge. Line-level styling may supplement the exact
span, but it may not replace it.

`block_id` identifies a response block for browser reconciliation; canonical
navigation uses file, node, region, move, and line identities instead. Expanding
a gap can replace its block IDs without changing canonical identities.

Focus intervals are computed from the union of selected diff regions and move
endpoints, expanded by three context lines, then merged when they overlap or
are close enough to avoid tiny gaps.

The annotated XML determines which regions are semantically interesting. A
normal line diff over the already extracted revision sources may derive display
alignment; it does not replace or rerun srcDiff analysis.

A gap is explicit. It must distinguish omitted source from empty source lines
and must report hidden ranges for both revisions. Expanding a gap is not a
server mutation: the browser requests a larger immutable source range and
merges the returned block into its local view.

Supported initial focus profiles are:

- `changes-and-moves` — default;
- `moves`;
- `changes`;
- `complete-file`.

### Required source cases

The source contract must define both revision ranges even when one side is
empty:

| Case | Left side | Right side | Required behavior |
| --- | --- | --- | --- |
| Context | source lines | source lines | align unchanged lines |
| Deletion | source lines | empty | render deletion rows with right placeholders |
| Addition | empty | source lines | render addition rows with left placeholders |
| Replacement | source lines | source lines | align presentation rows and retain distinct semantic regions |
| New file | empty file | complete or focused source | preserve an explicit empty left revision |
| Deleted file | complete or focused source | empty file | preserve an explicit empty right revision |
| Same-file move | source endpoint | destination endpoint | anchor both endpoints to one move identity |
| Cross-file move | endpoint in file A | endpoint in file B | load both file windows before navigation |
| Reordered units | stable `file_id` | stable `file_id` | do not use unit order as identity |

Every aligned row carries nullable left and right line records. A present line
uses its canonical one-based source line number. A placeholder has no line
number and is not confused with an empty source line. A hunk reports its
canonical left and right bounds independently.

Gap expansion is also revision-aware. Expanding above, below, or completely
produces requested canonical ranges on both sides; it does not assume equal
line numbers or equal hidden counts.

## Filtering and Pruning

Destructive pruning is not part of the new interactive architecture.

The existing `none`, `file-only`, `file-and-tree`, and `move-only` modes were
primarily workarounds for the monolithic response. Reproducing them would add
complexity while retaining their main drawbacks: lost context, rewritten XML,
changed spans and identities, and projections based on a synthetic document.

Useful filtering remains as view behavior:

- show files with moves or with any changes;
- focus source on changes, moves, or both;
- filter move lists by classification or provenance;
- filter or search the tree while retaining required ancestors.

These controls decide which projections are requested or displayed. They do
not overwrite the artifact or create pruned XML.

The old pruning implementation and monolithic-response adapter have been
deleted. Filtered XML export is not implemented without a demonstrated
requirement.

## Projection API

The initial API should remain small:

```text
POST /api/history/pairs/{pair_number}/runs
GET  /api/runs/{run_id}
GET  /api/runs/{run_id}/events
POST /api/runs/{run_id}/cancel

GET  /api/artifacts/{artifact_id}
GET  /api/artifacts/{artifact_id}/files/{file_id}/source
GET  /api/artifacts/{artifact_id}/files/{file_id}/tree
GET  /api/artifacts/{artifact_id}/tree/nodes/{node_id}
GET  /api/artifacts/{artifact_id}/tree/nodes/{node_id}/children
GET  /api/artifacts/{artifact_id}/xml
```

The artifact manifest is small enough to render the file navigator and choose
the first request. It includes file summaries, move summaries and lightweight
endpoint anchors, available focus profiles, capabilities, and safe provenance.
It does not expose filesystem paths.

The initial tree response is a bounded projection containing the file root,
the ancestor paths needed for the active focus profile, child counts, and a
limited number of children. Expanding an unloaded branch requests its canonical
children by stable `node_id`. The complete normalized XML is fetched when its
tab opens together with indexed change/move anchors. Those anchors preserve
stable selection without transferring the complete structural tree. XML-
neighborhood endpoints are deferred until measurements demonstrate that they
are necessary.

Each projected tree node reports `node_id`, display metadata, canonical spans,
`child_count`, and either a complete child list or an explicit continuation.
An absent child list never means that the canonical node is a leaf unless
`child_count` is zero. Child requests have deterministic canonical ordering and
bounded page sizes.

Projection requests are stateless and independently retryable. Source ranges
use explicit bounded coordinates. Responses include schema versions and do not
silently fall back when the frontend and backend contracts disagree.

## Run Execution

Long history comparisons use a small dedicated worker process and a
srcVisual-owned SQLite run queue. Redis, Celery, WebSockets, and server-side
view sessions are not required for the local product.

Run records and progress events are durable and shared by all web workers. SSE
events have sequence numbers and support reconnection. The run status endpoint
remains the authoritative fallback if an event connection is interrupted.

`GET /api/runs/{run_id}/events` replays events after the standard
`Last-Event-ID` header, uses the durable per-run sequence as each SSE event ID,
and emits comment heartbeats while an active run is idle. A stream closes after
delivering the terminal event. Reconnection therefore neither loses nor
duplicates acknowledged progress, and `GET /api/runs/{run_id}` remains the
authoritative polling fallback.

Cancellation must terminate the native process group, wait for termination,
and remove unpublished staging data. It must not corrupt srcMove's `.srcmove`
operation state. Duplicate history work will use a fingerprinted single-flight
lock so concurrent callers can follow the same run and artifact.

Each claimed run executes in a separate child process group containing the
Python artifact build and all descendant native commands. The queue worker
monitors durable cancellation requests. It first sends termination to the
whole group, escalates if the group does not exit, waits for it to be reaped,
and only then records `cancelled`. Cancelling an already completed run returns
a conflict and leaves its published artifact unchanged.

Uploaded XML remains synchronous initially unless measurements show that it
needs the run worker. The established multi-minute history path receives the
durable run model first.

### Durable run contract

The first Phase 3 slice stores runs in `runs.sqlite3` at the root of the
existing persistent artifact volume. The database belongs to srcVisual and is
independent of srcMove's repository-local history database. Each history
visualization run has one opaque `run_id`, one positive srcMove pair number,
and exactly one of these states:

```text
queued -> running -> completed
                  -> failed
                  -> cancelled
queued ----------> failed
       ----------> cancelled
```

`completed` requires an immutable published `artifact_id`. `failed` and
`cancelled` never have one. A cancellation request is durable but does not
change the run to `cancelled`; the worker must first terminate and reap the
native process group. Terminal runs cannot transition again.

Run creation is a fingerprinted single-flight operation. srcVisual hashes
srcMove's versioned `pair_fingerprint` together with the srcVisual artifact
schema version and artifact-building configuration. It does not inspect
srcMove's database or recreate srcMove's history identity rules. Matching
queued or running work returns the existing run with `202` and
`reuse: active-run`. A matching completed run is returned with `200` and
`reuse: artifact` only after full manifest, checksum, and index validation.
Otherwise the endpoint queues a new run with `202` and `reuse: new`; invalid
completed candidates are quarantined when present and excluded from that
request's reuse search.

The run-creation response is a separate schema-version-1 contract containing
the run-status object and the typed `reuse` disposition. Its schema evolves
independently of the run-status and event contracts.

`GET /api/runs/{run_id}` is the polling fallback and returns run contract
schema version 1. Its run object contains the kind `history-visualization`,
pair number, state, nullable artifact ID, cancellation flag, safe nullable
diagnostic, UTC lifecycle timestamps, and latest event sequence. Diagnostics
contain a stable code and display-safe message, never an exception traceback
or filesystem path.

Every lifecycle transition and progress update appends an event in the same
SQLite transaction as its run-state change. Event sequence numbers are
positive, contiguous, and local to one run. Events record their type, the
resulting run status, display-safe message, and UTC timestamp. Ordered reads
accept an exclusive `after` cursor and a bounded limit; the later SSE endpoint
will use the same durable sequence as its event ID.

## Frontend Rendering

The artifact manifest replaces `VisualizeResponse` as the root frontend
contract. Source, tree, and XML data have separate explicit types and loading
states.

The source view lists every manifest file as a collapsible card. Only expanded
cards request focused source projections, so the list can represent a large
change without eagerly downloading every file. File and move navigation can
request additional files or ranges. Selecting a move narrows the list to its
participating files by default and offers one action to reveal every endpoint.

Move endpoint badges remain available when code is collapsed. A collapsed
participating file registers revision-specific header proxies with the same SVG
overlay used by rendered code; expanding it replaces those proxies with exact
source endpoints. This preserves cross-file provenance without eagerly loading
code or inventing off-screen coordinates, and it remains compatible with later
source-row virtualization.

The artifact renderer should adapt the proven legacy highlighting and SVG
connector behavior to artifact-local identities instead of replacing it with a
less expressive interaction. Selecting or hovering a move highlights every
rendered endpoint at character precision and draws the relationship between
visible endpoints. Same-file, cross-file, one-to-many, and many-to-one moves
retain clear endpoint and group identity. When an endpoint is not rendered,
navigation and badges remain available without drawing misleading geometry.

Move fragments, badges, tree nodes, and connectors use the established
yellow/amber move hue. Ordinary unchanged source is neutral near-black. Insert
and delete styling remains green and red; selection may add a border or glow
without changing the underlying semantic hue.

Virtualization is introduced only after the hunk/gap model works correctly and
measurements show that rendered focused rows remain excessive. Expansion must
preserve the user's scroll anchor.

## Delivery Plan

### Phase 0: contract and baseline

Status: complete.

- Classify the existing full-suite backend and frontend failures.
- Measure serialized bytes and build time separately for XML, sources, trees,
  move data, validation, and JSON encoding.
- Specify examples for aligned hunks and gaps covering additions, deletions,
  replacements, new/deleted files, reordered units, moves, and cross-file
  moves.
- Specify stable identity, artifact integrity, path normalization, and failure
  invariants.
- Keep this canonical architecture document and `docs/Rules.md` synchronized
  without duplicating implementation detail elsewhere.

### Phase 1: artifact foundation

Status: complete. This migration phase established canonical artifact
construction behind the then-existing compatibility endpoint.

- Separate canonical artifact construction from presentation payload creation.
- Add the dedicated persistent artifact volume and configuration.
- Persist normalized XML, extracted sources, manifest, and indexes atomically.
- Ingest history `results.json` when available.
- Add integrity validation and staging cleanup.
- Implement the old monolithic payload as a temporary compatibility projection
  from the artifact.
- Prove compatibility on archive-style and single-root fixtures.

This is the smallest safe implementation slice. It establishes the core
boundary without changing the user interface.

The pair 13 scale check published 297,770 canonical nodes in 65.51 seconds.
The artifact occupied 107,815,213 bytes, including a 98,742,272-byte SQLite
index. Per-node payload compression and integer parent identities reduced the
first normalized-index draft from 545,665,325 bytes without weakening stable
external node identities. Its compatibility projection retained all 12 XML
move annotations and the producer metadata for the five moves described by
the retained `results.json`.

### Phase 2: source-first artifact interface

Status: complete.

- Add artifact manifest and aligned source projection endpoints.
- Implement explicit gaps and bounded expansion.
- Add the four initial focus profiles.
- Load one selected file initially and both endpoints for move navigation.
- Add bounded tree projections and lazy canonical-child retrieval.
- Load the whole XML only when its tab is opened.
- Remove destructive pruning controls from the artifact UI.
- Keep the legacy interface available as a temporary fallback. (Retired after
  parity was demonstrated.)

The implemented projection contract uses schema version 1 over artifact schema
version 2. Artifact creation now returns the manifest directly. Source
responses are capped at 2,000 aligned rows, tree responses at 500 nodes, and
child pages at 100 nodes. Expanded source ranges remain browser state and are
sent as explicit repeated revision-aware ranges; the server returns their
union with the active focus profile. The complete XML is a separate lazy
request. The artifact UI exposes focus profiles instead of destructive pruning
or skipped-tag request controls.

The artifact-only creation path publishes the canonical artifact without
constructing or reloading a monolithic projection.

This phase delivers the first user-visible payoff and validates the artifact
model before expanding its scope.

### Phase 2.5: move visualization parity

Status: complete.

- Source projections return revision-local line and column spans for semantic
  anchors.
- The artifact source renderer splits lines at exact semantic boundaries and
  gives move spans precedence when they overlap enclosing insert/delete
  regions.
- The established yellow/amber move treatment and neutral unchanged-source
  surface are restored.
- The legacy SVG connector geometry is reused for rendered artifact endpoints.
- Selecting a cross-file move represents every participating file under one
  connector overlay; expanded files register rendered source endpoints and
  collapsed files register header proxies. Same-file, cross-file,
  one-to-many, and many-to-one geometry use the same registration model.

This slice restored the essential source-level move inspection behavior. The
remaining pane, selection, and navigation work is now complete, and the
frontend compatibility renderer has been removed. Backend compatibility
retirement is also complete.

### Phase 3: durable history runs

Status: complete. The durable SQLite run/event store and polling status
contract are implemented. A dedicated worker claims queued history runs,
materializes them through srcMove, and publishes their artifacts. The
synchronous history compatibility endpoint has been removed.

- The dedicated worker and durable run/event store are complete. Worker
  startup marks interrupted running jobs failed without automatically
  repeating repository-local work; queued jobs remain eligible.
- Run creation returns a queued run ID immediately from
  `POST /api/history/pairs/{pair_number}/runs`.
- Reconnectable SSE, polling fallback, cancellation, and process-group cleanup
  are complete.
- Fingerprinted single-flight creation suppresses duplicate active work.
- Valid completed artifacts are reused by fingerprint without transferring
  ownership of `.srcmove` state to srcVisual; failed validation queues a new
  run.

### Phase 4: complete frontend migration

Status: complete. History visualization creation uses the durable run
contract, displays reconnectable SSE progress, retains authoritative status
polling, supports durable cancellation, and opens the completed artifact
through the projection interface. Upload visualization returns an artifact
manifest directly.

The Source view now renders the complete manifest as a searchable,
GitHub-inspired list of collapsible file cards. Source remains lazy per file.
For a selected move, expanded cards expose exact semantic endpoints and
collapsed cards expose file-header endpoint proxies, allowing one SVG overlay
to communicate same-file and cross-file provenance. Rendered fragments that
belong to one semantic endpoint are combined into one outline, so line wrapping
does not imply multiple moves.

Artifact selection now uses stable node and move identities across the
structure tree, Move Summary, Node Info, and Source. A bounded single-node
projection supplies canonical tag metadata and revision spans for Node Info.
Move Summary exposes each semantic from/to endpoint directly; choosing one
selects its file, expands its lazy Source card, and scrolls to the rendered tag
without converting the selection into a line-based diff concept.

The lazy XML projection exposes indexed change/move spans with the same stable
node IDs. Selecting one synchronizes the file, tree, Node Info, Move Summary,
and Source state; a selected move also becomes visible when Source is reopened.
Nested move spans take visual precedence over enclosing insert/delete wrappers,
so the XML view retains tag semantics rather than flattening them into lines.

Connector visibility is independent of semantic selection. Clicking a moved
tag selects the move and reveals its connector; navigator move chips toggle
individual connectors without changing the current selection. Source provides
`Selected`, `All`, and `None` visibility controls. `All` still respects lazy
rendering: connectors terminate at rendered semantic endpoints or collapsed
file-header proxies and never force every source projection to load.

Move rendering must communicate semantic move groups rather than individual
rendered lines. One multi-line source endpoint and its destination endpoint
should each have one bounding outline around the complete contiguous moved
region, with one connector representing their move relationship. Line wrapping
or line-by-line source rendering must not create extra boxes or connectors.
Discontinuous, one-to-many, and many-to-one moves may have multiple endpoint
regions, but each box and connector must correspond to an actual semantic
endpoint or relationship so one move cannot be mistaken for several moves.

#### Parity audit: projection identity and file ownership

The first compatibility-retirement audit slice completed on 2026-09-24. Its
parity evidence supported staged removal of the frontend renderer, HTTP
compatibility surface, monolithic payload builder, and destructive pruning.

Packaged-tool endpoint tests now exercise an archive input with a move into a
new file and a single-root input with a same-file move. Both build artifacts
through the normal upload route, then verify that the manifest, source, XML,
tree, and single-node projections use the same endpoint IDs. A focused
projection matrix additionally covers same-file, cross-file, new-file, and
deleted-file moves. It checks explicit empty revision sources for new and
deleted files and confirms that source anchors remain owned by the manifest
file identified by each endpoint ID.

The reordered-unit case publishes equivalent archive artifacts in opposite
unit orders. Manifest order follows the canonical XML order, while the logical
files and their move endpoint IDs remain stable. This demonstrates that the
artifact identity used by Source, XML, the structure tree, Node Info, and Move
Summary does not derive from archive unit position.

The audit found the compatibility callers that governed retirement:

- `POST /api/visualize` now always returns an artifact manifest. Its
  `response_format`, `include_skipped_tags`, and `pruning_level` options have
  been removed. The synchronous
  `POST /api/history/pairs/{pair_number}/visualize` route has also been removed;
  durable history runs are the sole history visualization path.
- The frontend now accepts only `ArtifactManifest` and renders only artifact
  projections. The legacy render branch, selection state, tree and source
  containers, fixtures, and monolithic contract validation have been removed.
  Uploads send no response-format or destructive-pruning controls.
- Compatibility route and workflow tests were replaced by artifact-contract
  coverage after the old contract became unreachable.

The measurement script is no longer a compatibility caller. Historical
monolithic numbers remain recorded in the Phase 0 baseline, while new runs
measure immutable artifact storage and the bounded projections used by the
current frontend.

The monolithic builder, destructive tree/XML/source/move pruning modules, and
their compatibility tests have been deleted. The canonical artifact builder
continues to call `render_revision_files()` in `_source_renderer.py` to
calculate revision-local source spans from complete XML. Internal
`include_skipped_tags` parameters remain where canonical XML, tree, span, and
srcMove validation algorithms require an explicit semantic choice; they are
not request controls.

- Move tree, XML, move summary, selection, and navigation state to artifact
  contracts. (Complete.)
- Extend source projections with revision-local line and column spans, then
  restore character-precise insert, delete, and move fragments. (Complete.)
- Port the legacy move highlighting and SVG connector interactions to
  artifact-local identities, including same-file, cross-file, one-to-many, and
  many-to-one moves. Draw connectors only for rendered endpoints. (Complete.)
- Restore the established yellow/amber move language and use a neutral
  near-black background for unchanged source. (Complete.)
- Add file-list filters when the manifest navigator needs them. (Complete.)
- Add row virtualization only if future focused-rendering measurements justify
  it. (Deferred; the bounded projection is sufficient currently.)
- Remove the frontend monolithic-response renderer and its legacy state,
  components, fixtures, and validation. (Complete.)
- Remove the monolithic response path and destructive pruning after parity is
  demonstrated. (Complete.)

### Phase 5: operational hardening and measured extensions

- Add item and disk quotas, collection policy, integrity diagnostics, and cache
  metrics.
- Add background upload runs if upload measurements justify them.
- Add XML neighborhoods only if whole-document retrieval remains a measured
  problem.
- Add filtered XML export only for a demonstrated workflow.
- Perform separate authorization, sandboxing, resource-limit, and threat-model
  work before any public untrusted deployment.

## Acceptance Criteria

- A completed analysis is published as one immutable artifact or not published
  at all.
- Restarting a Flask worker does not lose an artifact, run state, or progress
  history.
- The default source view lists every changed file but downloads and renders
  focused blocks only for expanded files.
- Every omitted source range is an explicit expandable gap.
- Any source range can be revealed without rerunning native analysis.
- Cross-file move navigation loads and identifies both endpoints.
- Moved source is highlighted to exact character boundaries, not merely by
  line, and visible endpoints use the established SVG relationship rendering.
- Moves are yellow/amber across source, tree, badges, and connectors; unchanged
  source uses a neutral near-black background.
- XML, tree, source, diff, and move projections use the same artifact-local
  identities.
- No manifest, XML response, diagnostic, or artifact ID exposes temporary or
  host filesystem paths.
- Switching focus profiles does not mutate the artifact, rerun analysis, or
  generate pruned XML.
- Existing archive-style and single-root inputs remain supported.
- srcMove remains the sole owner of history comparison semantics and
  repository-local `.srcmove` state.
