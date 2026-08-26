# Web project — common tasks for teammates.
# Run `make help` for the list.

.PHONY: help setup install dev build test lint lint-fix typecheck check clean

help:
	@echo "Targets:"
	@echo "  setup        Install Node deps and verify toolchain"
	@echo "  install      npm install (alias for setup minus the version checks)"
	@echo "  dev          Run Vite dev server"
	@echo "  build        Type-check + production build"
	@echo "  test         Run vitest once"
	@echo "  lint         Run ESLint (zero warnings allowed)"
	@echo "  lint-fix     Run ESLint with --fix"
	@echo "  typecheck    Type-check only (no emit, no bundle)"
	@echo "  check        lint + typecheck + test (CI gate)"
	@echo "  clean        Remove dist and node_modules"

setup:
	npm run setup

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

lint-fix:
	npm run lint:fix

typecheck:
	npx tsc -p tsconfig.json --noEmit

check: lint typecheck test
	@echo "All checks passed."

clean:
	rm -rf dist node_modules
