srcVisual visualizes `srcDiff` and `srcMove` results in a frontend UI.

Main purpose:

- make it easy to inspect `srcDiff` structure and correlate XML tags with source code
- make move detection from `srcMove` easy to verify visually
- make highlighting trustworthy across the tree view, XML view, and source-code panes

High-level backend flow:

- accept uploaded or pasted `srcDiff` XML
- add position information with `srcdiff --position` when needed
- add move annotations with `srcMove` when needed
- return a normalized payload for the frontend with annotated XML, move results, file/source data, and tree data

Important expectations:

- support both archive-style srcDiff input and single-root file-unit srcDiff input
- use temporary generated files only as an internal implementation detail
- preserve original srcDiff metadata in the final positioned/annotated XML
- the frontend should clearly show which file/unit each highlight belongs to
