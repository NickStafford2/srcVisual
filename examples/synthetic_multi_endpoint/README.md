# Synthetic multiple-endpoint figure candidate

This constructed C++ example illustrates srcDiffVisual group rendering. It is
not repository-history evidence or an evaluation case. Source snippets are
parse fixtures; helper functions and variables are intentionally undeclared.

## Input files

- `../synthetic_2x3_cross_file.srcdiff.xml`: positioned native srcDiff output,
  packaged as an archive with native srcML. Upload or paste this into
  srcDiffVisual to run its normal srcMove analysis.
- `../synthetic_2x3_cross_file.srcmove.xml`: the same archive annotated by native
  srcMove. Upload this to inspect the retained annotations without rerunning
  matching. XML alone does not retain all JSON diagnostic fields.
- `before/` and `after/`: the two constructed source revisions.
- `units/`: native positioned srcDiff for each corresponding file pair.
- `results.json`: actual srcMove output, including diagnostics.

No diff regions, endpoint lists, or move annotations were hand fabricated.
Logical filenames are supplied to srcDiff so the two revisions of each file
have the same identity. The native archive also carries the synthetic URL
`synthetic-multi-endpoint`, which identifies a multi-file archive to the viewer.

## Verified relationships

| Report | Original endpoints | Modified endpoints | Purpose |
| --- | --- | --- | --- |
| `97b1dcdaf` | 2 in `01_sources.cpp` | 3 in `02_targets.cpp` | Exact Type-1 atomic group with unresolved individual partners |
| `c89025cc1` | 1 in `03_local.cpp` | 1 in `03_local.cpp` | Exact Type-1 declaration relocation within a file |

The group contains five identical `record_event("checkpoint", session_id,
elapsed_ms);` statements. Its 2-by-3 endpoint lists do not establish six
individual moves or determine which occurrence supplied which counterpart.
The local declaration crosses three preserved calls; diagnostics report
`file_observation: same`, `anchor_interval_observation: crossed`, and
`classification_reason: crossed_stable_sibling`.

## Screenshot suggestion

In Source, expand `01_sources.cpp` and `02_targets.cpp`, select `97b1dcdaf`, and
choose **Current only**. Close the details panel so the two original and three
modified statements and their shared connector hub are visible. Collapse
`03_local.cpp` for this figure; inspect it separately for the within-file
example. All source and destination files continue in both revisions.

Suggested caption: **Synthetic example of a multiple-endpoint group in
srcDiffVisual. Two original statements and three modified statements share
identical contents. A shared connector hub shows their membership in one
reported group without selecting individual partners.**

## Reproduce

From the parent workspace root, with Docker running:

```bash
./bin/srcml-dev-shell bash /workspace/srcDiffVisual/examples/synthetic_multi_endpoint/regenerate.sh
```

Verified on 2026-10-15 using `srcMove v0.7.0` and `srcdiff 0.1.0`.
The executable SHA-256 values used for this fixture were:

- srcMove: `12c21cf13b6ac99a87982a70e6cac748aacadfc85e9d9ab244e86aacaedb0365`
- srcDiff: `36e0b7e021e997cd0aadbe899ad56c90c97c250d4c9be0159243229e44b0e7df`

Observed source checkouts were srcMove `eca5d082d35c8f37d64fcd2398e0a69cbbe637af`
and srcDiff `f48b8180e0c2e9d07e098553d96ed3895676bfdc`; source-to-binary binding
was not independently verified for this illustrative fixture. Results are the
outputs of the executable checksums above.
