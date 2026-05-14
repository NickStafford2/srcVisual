`srcVisual` exists to make `srcDiff` and `srcMove` output easy to inspect. This is a visualization tool for srcMove specifically.

High-level rules:

1. Final annotated XML metadata is the source of truth for visualization.
   The frontend should render files/units according to the final annotated `srcDiff` / `srcMove` output, not according to temporary backend implementation details.

2. Temporary files are implementation details only.
   Generated temp filenames or temp paths may be used internally to run backend tools, but they must not leak into the final positioned or annotated XML returned by `srcVisual`.

3. Position generation must preserve the original srcDiff content.
   When `srcVisual` accepts a `srcDiff.xml` file that does not have position information, it should generate a new `srcDiff.xml` file that is identical except for added position information. Other than the new position information, tags, ordering, attributes, and tag content should remain the same as the original input.

4. Support both srcDiff shapes.
   `srcVisual` must support both:

- archive-style srcDiff with nested file units
- single-root file-unit srcDiff

5. Single-file pair metadata is valid.
   A `filename` value like `original.cpp|modified.cpp` is a valid single-file srcDiff shape. Treat it as real source metadata, not as a literal temp output path.

6. Moves are a first-class use case.
   It must be easy to verify `srcMove` results, especially cross-file moves, new-file moves, deleted-file moves, and reordered units. File ownership and unit ordering must remain correct through the backend pipeline.

7. Package boundaries should stay explicit.
   Keep `__init__.py` empty. Do not use re-exports. Files only imported inside the same subpackage should use `_` filenames. Example: if `examples.py` is only used by `routes.py` inside `web/`, it should be `_examples.py`. Test imports do not count when deciding this. Files imported from outside the subpackage by non-test code should not use `_`.
