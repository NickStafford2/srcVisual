Use the repository Make targets when developing or debugging `srcVisual`.
They keep the native backend checks and frontend build in reproducible Linux
containers and provide one stable command surface for humans and agents.

All required checks:

```bash
make test
```

Backend:

- run backend lint: `make lint`
- run all backend tests: `make test-backend`
- run tests that do not invoke native tools: `make test-backend-unit`
- run one backend example:
  `make test-backend PYTEST_ARGS='tests/test_examples_e2e.py -k blocks_swapped -vv'`

Backend tests run in the packaged `srcvisual:local` image because the complete
suite invokes `archive_reader`, `srcdiff`, and `srcMove`. Rebuild that image
with `make image` after dependency, native-tool, or Dockerfile changes. Source
changes do not require a rebuild because the checkout is bind-mounted into the
test container.

Frontend:

- run tests and the production build: `make test-frontend`
- run only the production build: `make build-frontend`

The frontend targets use the Dockerfile's cached dependency layer. For quick
interactive work, the equivalent host commands remain `npm test` and
`npm run build` from `frontend/`, but `make test` is the authoritative
cross-platform check.

Temp files:

- keep temp dirs for inspection: `SRCVISUAL_KEEP_TMP=1`
- change temp root: `SRCVISUAL_TMP_ROOT=/some/path`
- default temp root is `srcVisual/temp/`

Artifacts:

- change the artifact store: `SRCVISUAL_ARTIFACT_ROOT=/some/path`
- Compose uses the persistent `srcvisual-artifacts` named volume
- durable history runs use `runs.sqlite3` at the artifact-store root
- incomplete staging directories older than 24 hours are removed at startup

Debugger:

- Code launch config is in `.vscode/launch.json`
