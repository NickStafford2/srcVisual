Use these when debugging `srcVisual`.

Backend:

- run all backend tests: `poetry run pytest`
- run one backend example: `poetry run pytest tests/test_examples_e2e.py -k blocks_swapped -vv`

Frontend:

- run all frontend tests: `cd frontend && npm test`
- run focused frontend tests: `cd frontend && npm test -- --run <test-file>`

Temp files:

- keep temp dirs for inspection: `SRCVISUAL_KEEP_TMP=1`
- change temp root: `SRCVISUAL_TMP_ROOT=/some/path`
- default temp root is `srcVisual/temp/`

Debugger:

- Code launch config is in `.vscode/launch.json`
