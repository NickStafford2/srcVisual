# Backend Package Map

Goal: remove vague package names like `core/` and reduce the flat `srcvisual/` root.

Target backend shape:

- `srcvisual/web/`
  Flask app, routes, SSE progress, example loading, WSGI entry.
- `srcvisual/workflow/`
  End-to-end visualization orchestration and backend command flow.
- `srcvisual/files/`
  Input file extraction, filename handling, source file materialization.
- `srcvisual/srcdiff/`
  XML and srcDiff/srcMove structure logic.
- `srcvisual/validation/`
  Cross-checks for payloads, XML, tree data, and move results.
- `srcvisual/model/`
  Shared dataclasses and error types.

Rules for this layout:

- `__init__.py` stays empty.
- No re-exports.
- Files only used inside one subpackage use `_`.
- Test imports do not count when deciding `_`.

## Current To Target

| Current file | Target file | Why |
| --- | --- | --- |
| `srcvisual/web/app.py` | `srcvisual/web/app.py` | Already in the right package. |
| `srcvisual/web/wsgi.py` | `srcvisual/web/wsgi.py` | Already in the right package. |
| `srcvisual/web/_routes.py` | `srcvisual/web/_routes.py` | Internal web route module. |
| `srcvisual/web/_progress.py` | `srcvisual/web/_progress.py` | Internal web SSE support. |
| `srcvisual/web/_examples.py` | `srcvisual/web/_examples.py` | Internal web example loading. |
| `srcvisual/pipeline.py` | `srcvisual/workflow/payload.py` | Public workflow entrypoint for `build_visualization_payload`. |
| `srcvisual/srcdiff.py` | `srcvisual/workflow/_srcdiff.py` | Internal orchestration around srcDiff and srcMove. |
| `srcvisual/srcmove.py` | `srcvisual/workflow/_srcmove.py` | Internal srcMove process runner and settings. |
| `srcvisual/_positioned_srcdiff.py` | `srcvisual/workflow/_positioned_srcdiff.py` | Internal positioned-srcDiff generation. |
| `srcvisual/_moved_srcdiff.py` | `srcvisual/workflow/_moved_srcdiff.py` | Internal moved-srcDiff helpers. |
| `srcvisual/notify.py` | `srcvisual/workflow/_notify.py` | Workflow-local progress callback support. |
| `srcvisual/tempfiles.py` | `srcvisual/workflow/_tempfiles.py` | Workflow-local temp workdir management. |
| `srcvisual/visualize_data.py` | `srcvisual/workflow/_visualized_files.py` | Workflow-local payload assembly. |
| `srcvisual/transform/move_results.py` | `srcvisual/workflow/_move_results.py` | Workflow-local move result normalization. Remove weak `transform/` package. |
| `srcvisual/core/archive.py` | `srcvisual/files/archive.py` | Extract revision files from uploaded srcDiff input. |
| `srcvisual/core/source_files.py` | `srcvisual/files/_source_files.py` | Internal file writing helper for `files/`. |
| `srcvisual/core/filenames.py` | `srcvisual/files/filenames.py` | Shared filename normalization and sanitization. |
| `srcvisual/workflow/_commands.py` | `srcvisual/workflow/_commands.py` | Backend command execution is part of workflow runtime behavior. |
| `srcvisual/workflow/_pruning.py` | `srcvisual/workflow/_pruning.py` | Payload pruning is workflow output shaping. |
| `srcvisual/workflow/models.py` | `srcvisual/workflow/models.py` | Workflow payload and file data stay close to workflow behavior. |
| `srcvisual/srcdiff/_models.py` | `srcvisual/srcdiff/_models.py` | Tree and span data stay close to srcDiff tree behavior. |
| `srcvisual/core/namespaces.py` | `srcvisual/srcdiff/_namespaces.py` | Internal XML namespace constants for srcDiff logic. |
| `srcvisual/core/units.py` | `srcvisual/srcdiff/_units.py` | Internal XML unit helpers. |
| `srcvisual/core/spans.py` | `srcvisual/srcdiff/spans.py` | Shared span building logic used across srcDiff and validation. |
| `srcvisual/core/srcdiff_attributes.py` | `srcvisual/srcdiff/attributes.py` | Shared srcDiff/srcMove attribute parsing. |
| `srcvisual/core/srcdiff_restore.py` | `srcvisual/srcdiff/restore.py` | Restore original srcDiff metadata after position generation. |
| `srcvisual/core/tree_builder.py` | `srcvisual/srcdiff/tree.py` | Build tree payload from annotated XML. |
| `srcvisual/core/srcmove_paths.py` | `srcvisual/srcdiff/_srcmove_paths.py` | Internal srcMove path parsing helpers. |
| `srcvisual/core/_srcmove_results.py` | `srcvisual/srcdiff/_srcmove_results.py` | Internal srcMove results parsing helpers. |
| `srcvisual/validation/move_regions.py` | `srcvisual/validation/move_regions.py` | Shared move-region validation support. |
| `srcvisual/validation/srcmove_results.py` | `srcvisual/validation/srcmove_results.py` | Cross-check results JSON against moved XML. |
| `srcvisual/validation/tree.py` | `srcvisual/validation/tree.py` | Cross-check tree payload against moved XML. |
| `srcvisual/validation/payload.py` | `srcvisual/validation/payload.py` | Validate final API payload structure. |
| `srcvisual/validation/xml.py` | `srcvisual/validation/xml.py` | Validate XML span index. |
| `srcvisual/test_runner.py` | `srcvisual/test_runner.py` | CLI helper. Fine at package root for now. |

## End State

After the moves above, the root package should be close to this:

```text
srcvisual/
  __init__.py
  context-export.toml
  test_runner.py
  files/
  model/
  srcdiff/
  validation/
  web/
  workflow/
```

`core/` should be gone.

`transform/` should be gone.

## Refactor Order

1. Move workflow files out of the root.
   This removes the largest top-level clutter first.

2. Move `core/archive.py`, `core/source_files.py`, and `core/filenames.py` into `files/`.
   These are a clean cluster with low ambiguity.

3. Move shared XML and srcDiff logic from `core/` into `srcdiff/`.
   This is the biggest `core/` slice and gives the package a real meaning.

4. Move validation from `core/validation/` to top-level `validation/`.
   Validation is a real package and should not live under `core/`.

5. Keep workflow payload data and srcDiff tree data near the behavior that owns them.
   Avoid recreating a generic shared model package unless a real need appears.

6. Delete empty old packages.
   Remove `core/` and `transform/` only after all imports are updated.

## Notes

- Do not recreate a generic `model/` package by reflex.
- Do not create a separate `runtime/` package yet. It would add churn without a clear gain.
- Keep one public workflow entry module. Everything else in `workflow/` should be private unless a new real boundary appears.
