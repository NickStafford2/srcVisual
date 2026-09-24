# BigMoveBench Type-3 review

srcVisual can import the deterministic `type3-review.zip` produced by srcMove's
BigMoveBench runner. Choose **BigMoveBench** on the Input tab, import the ZIP,
filter passed or review-needed cases, and open any case in the normal Source,
XML, structure, node, and move views. Previous and next controls remain visible
while a case is open.

The ZIP is the boundary between the repositories. It contains a versioned
manifest and one directory per case with:

- the expected original and modified Java fragments;
- the exact srcDiff XML evaluated by the benchmark;
- annotated srcMove XML for visualization;
- the complete results JSON, including opt-in candidate and Type-3 edge
  diagnostics; and
- a self-contained review JSON record with the benchmark outcome, automatic
  miss diagnosis, and empty AI/human verdict fields.

srcVisual stores imported bundles by their SHA-256 identity below the configured
artifact root and publishes visualization artifacts lazily when a case is
opened. It does not reinterpret the benchmark outcome. The original files make
the same bundle suitable for scripted or AI review without using srcVisual.

Generate a medium review bundle from the parent workspace with:

```bash
make -C srcMove bigmovebench-suite \
  PROFILE=medium PAIR_SET=type3 TYPE3_REVIEW=1
```

The run directory also contains `type3-review.jsonl` for streaming analysis and
`type3-review.md` for a printable review outside srcVisual.
