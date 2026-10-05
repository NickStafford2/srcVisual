# BigMoveBench results and review

Choose **BigMoveBench** on the Input tab to browse completed local thesis runs.
The newest run is selected automatically. Category cards show recorded outcome
counts; click a count or use the category and outcome filters to narrow the case
table. Pages contain 50 cases. Search matches case IDs and recorded oracle
failure reasons.

Select a case to see its exact original and modified Java fragments side by
side, expected generated line ranges, observed classification, recorded oracle
reasons, and reported moves. Expand a move to inspect its source and destination
text, XPath references, and full record. Available diagnostics and tool hashes
appear under **Diagnostics and provenance**. Missing cached fragments are shown
explicitly; fragment hashes are verified before displaying their text.

The **Outcome basis** control keeps original benchmark outcomes separate from
reviewed outcomes and label corrections. A classification disagreement can still
mean that the complete expected fragment was detected. Conversely, a missed
complete fragment can contain reported smaller moves. Negative cases do not have
a positive complete-fragment detection score.

This browser reads retained evidence without rerunning srcDiff, srcMove, or the
benchmark. It does not create annotated XML or open saved cases in the full Source
view; that remains available through the portable review workflow below.

## Local data and interface

The backend requires `bigMoveBench.browser` on `PYTHONPATH` and these settings:

- `SRCDIFFVISUAL_BIGMOVEBENCH_RESULTS_ROOT`: thesis-runs directory;
- `SRCDIFFVISUAL_BIGMOVEBENCH_CACHE_ROOT`: benchmark cache containing case
  definitions and compiled fragments.

The workspace Compose configuration mounts both directories read-only, together
with the srcMove-owned reader. The packaged image includes the reader. With no
configured roots, the browser reports that no local runs are available.

The versioned JSON interface is owned by srcMove; srcDiffVisual adapts it through:

- `GET /api/bigmovebench/runs`
- `GET /api/bigmovebench/runs/<run_id>`
- `GET /api/bigmovebench/runs/<run_id>/cases`
- `GET /api/bigmovebench/runs/<run_id>/cases/<category>/<case_id>`

The case-list endpoint accepts `category`, `outcome`, `basis` (`original` or
`reviewed`), `query`, `offset`, and `limit` (1–100). Responses use schema version 1.
Only completed thesis runs are listed. The reader uses the latest terminal
attempt in each execution journal, including committed WAL pages, and does not
write benchmark data. Clients provide identities rather than filesystem paths.

## Portable Type-3 review

srcDiffVisual can import the deterministic `type3-review.zip` produced by srcMove's
BigMoveBench runner. Expand **Import a portable review ZIP** on the Input tab, import the ZIP,
filter passed or review-needed cases, and open any case in the normal Source,
XML, structure, node, and move views. Previous and next controls remain visible
while a case is open.

The portable ZIP contains a versioned
manifest and one directory per case with:

- the expected original and modified Java fragments;
- the exact srcDiff XML evaluated by the benchmark;
- annotated srcMove XML for visualization;
- the complete results JSON, including opt-in candidate and Type-3 edge
  diagnostics; and
- a self-contained review JSON record with the benchmark outcome, automatic
  miss diagnosis, and empty AI/human verdict fields.

srcDiffVisual stores imported bundles by their SHA-256 identity below the configured
artifact root and publishes visualization artifacts lazily when a case is
opened. It does not reinterpret the benchmark outcome. The original files make
the same bundle suitable for scripted or AI review without using srcDiffVisual.

Generate a medium review bundle from the parent workspace with:

```bash
make -C srcMove bigmovebench-suite \
  PROFILE=medium PAIR_SET=type3 TYPE3_REVIEW=1
```

The run directory also contains `type3-review.jsonl` for streaming analysis and
`type3-review.md` for a printable review outside srcDiffVisual.
