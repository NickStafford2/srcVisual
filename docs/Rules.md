# Application Rules

srcVisual makes srcDiff and srcMove output easier to inspect, with srcMove
evaluation as its primary use case.

High-level rules:

1. Final annotated XML is the semantic source of truth.
   Render files and units from the final srcMove-annotated srcDiff XML, not
   from temporary backend implementation details.

2. Temporary files are implementation details only.
   Generated temp filenames or temp paths may be used internally to run backend tools, but they must not leak into the final positioned or annotated XML returned by `srcVisual`.

3. Position generation must preserve the original srcDiff content.
   When input lacks position information, generating positioned srcDiff XML
   may add position metadata but must preserve the original tags, order,
   attributes, text, and source metadata.

4. Support both srcDiff document shapes.

   - archive-style srcDiff with nested file units
   - single-root file-unit srcDiff

5. Single-file pair metadata is valid.
   A `filename` value such as `original.cpp|modified.cpp` is source metadata,
   not a literal temporary output path.

6. Moves are a first-class use case.
   It must be easy to verify `srcMove` results, especially cross-file moves, new-file moves, deleted-file moves, and reordered units. File ownership and unit ordering must remain correct through the backend pipeline.

7. All visualization panes must reflect the same artifact.
   The XML, srcDiff tree, source-code, diff, and move panes must be projections of the same immutable artifact and compatible view specification. Lazy retrieval may omit data that is not currently displayed, but omitted ranges must be explicit and every returned identity must refer to the canonical artifact.

8. Interactive filtering must not rewrite canonical data.
   File filters and source focus profiles decide which projections are requested or displayed. They must not prune or overwrite annotated XML, change canonical source coordinates, or create new node identities. Destructive pruning is not part of the artifact architecture.

9. Package boundaries must remain explicit.
   Keep `__init__.py` empty and do not use re-exports. Prefix a module filename
   with `_` when non-test production code imports it only within its own
   subpackage. Do not prefix modules used from outside that subpackage.

10. Repository history and comparison execution belong to srcMove.
    srcMove's versioned CLI owns history status, pair ordering, compact
    evidence, frozen-tool execution, and repository-local analysis state.
    srcVisual must not query `.srcmove` with SQL, accept repository paths or
    commands from browser requests, or modify source files. A local deployment
    may give the CLI narrowly scoped write access to `.git` and `.srcmove`
    while keeping the source worktree read-only.
