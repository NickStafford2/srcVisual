DOCKER ?= docker
BACKEND_IMAGE ?= srcdiffvisual:local
FRONTEND_CHECK_IMAGE ?= srcdiffvisual-frontend-check:local
PYTEST_ARGS ?=

WORKSPACE_ROOT := $(abspath ..)
BACKEND_RUN = $(DOCKER) run --rm -v "$(CURDIR):/app" -w /app $(BACKEND_IMAGE)
DEV_COMPOSE = $(DOCKER) compose -f compose.yaml -f compose.dev.yaml

.DEFAULT_GOAL := help

.PHONY: help dev dev-stop dev-logs image lint test test-backend test-backend-unit test-frontend build-frontend

help:
	@echo "srcDiffVisual development targets"
	@echo "  make dev                Start frontend hot reload at http://localhost:5173"
	@echo "  make dev-stop           Stop the frontend development server"
	@echo "  make dev-logs           Follow the frontend development logs"
	@echo "  make test               Run every required check"
	@echo "  make lint               Run backend lint"
	@echo "  make test-backend       Run backend tests; pass PYTEST_ARGS='tests/...' to focus"
	@echo "  make test-backend-unit  Run backend tests that do not invoke native tools"
	@echo "  make test-frontend      Run frontend tests and production build in Docker"
	@echo "  make build-frontend     Run the production frontend build in Docker"
	@echo "  make image              Rebuild the packaged backend and native-tool image"

dev:
	$(DEV_COMPOSE) up -d --no-build srcdiffvisual history-worker frontend
	@echo "Frontend starting at http://localhost:5173 (first start installs dependencies)."
	@echo "Use make dev-logs to check readiness."

dev-stop:
	$(DEV_COMPOSE) stop frontend

dev-logs:
	$(DEV_COMPOSE) logs -f frontend

image:
	$(DOCKER) compose build srcdiffvisual

lint:
	$(BACKEND_RUN) /opt/venv/bin/ruff check srcdiffvisual tests scripts

test: lint test-backend test-frontend

test-backend:
	$(BACKEND_RUN) /opt/venv/bin/pytest -q $(PYTEST_ARGS)

test-backend-unit:
	$(BACKEND_RUN) /opt/venv/bin/pytest -q \
		--ignore=tests/test_examples_e2e.py \
		--ignore=tests/artifacts/test_workflow.py \
		$(PYTEST_ARGS)

test-frontend:
	$(DOCKER) build \
		--file "$(CURDIR)/Dockerfile" \
		--target frontend-test \
		--tag $(FRONTEND_CHECK_IMAGE) \
		"$(WORKSPACE_ROOT)"

build-frontend:
	$(DOCKER) build \
		--file "$(CURDIR)/Dockerfile" \
		--target frontend-builder \
		--tag $(FRONTEND_CHECK_IMAGE) \
		"$(WORKSPACE_ROOT)"
