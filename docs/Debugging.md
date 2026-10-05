Use the repository Make targets when developing or debugging `srcDiffVisual`.
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

Backend tests run in the packaged `srcdiffvisual:local` image because the complete
suite invokes `archive_reader`, `srcdiff`, and `srcMove`. Rebuild that image
with `make image` after dependency, native-tool, or Dockerfile changes. Source
changes do not require a rebuild because the checkout is bind-mounted into the
test container.

Compose mounts the workspace `srcMove/build/srcMove` executable. Rebuilding
srcMove can replace the file while a running container retains its old mount.
If srcMove fails to launch or the header reports an unknown version, refresh
both service mounts from the workspace root:

```bash
docker compose -f srcDiffVisual/compose.yaml -f srcDiffVisual/compose.dev.yaml \
  up -d --no-build --force-recreate srcdiffvisual history-worker
```

This preserves the named artifact volume.

Frontend:

- start Docker hot reload: `make dev` (see [local development](../README.md#run-locally-with-docker))
- follow development startup and errors: `make dev-logs`
- stop only the frontend development server: `make dev-stop`
- run tests and the production build: `make test-frontend`
- run only the production build: `make build-frontend`

The frontend targets use the Dockerfile's cached dependency layer. For quick
interactive work, the equivalent host commands remain `npm test` and
`npm run build` from `frontend/`, but `make test` is the authoritative
cross-platform check.

Temp files:

- keep temp dirs for inspection: `SRCDIFFVISUAL_KEEP_TMP=1`
- change temp root: `SRCDIFFVISUAL_TMP_ROOT=/some/path`
- default temp root is `srcDiffVisual/temp/`

Artifacts:

- change the artifact store: `SRCDIFFVISUAL_ARTIFACT_ROOT=/some/path`
- Compose uses the persistent `srcdiffvisual-artifacts` named volume
- durable history runs use `runs.sqlite3` at the artifact-store root
- incomplete staging directories older than 24 hours are removed at startup

Debugger:

- Code launch config is in `.vscode/launch.json`
