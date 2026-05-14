`srcMLBuildTemplate` is a workspace repository that contains multiple related projects.

Relevant subprojects include:

- `srcML`
- `srcDiff`
- `srcMove`
- `srcReader`
- `srcVisual`

The source code for those projects is available in this repository, and an LLM may read any of them as needed for context, debugging, or behavior verification.

Working assumption:

- almost all work is expected to happen inside `srcVisual`
- you may suggest changes to srcMove.

Editing rule:

- do not edit files outside `srcVisual` unless the user explicitly gives permission.
