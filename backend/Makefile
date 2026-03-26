.PHONY: all
all: install build

.PHONY: install
install:
	pnpm install

.PHONY: build
build:
	pnpm -r build

.PHONY: rebuild
rebuild: clean build

.PHONY: clean
clean:
	pnpm -r --parallel exec rm -rf dist
	pnpm -r --parallel exec rm -rf .tsbuildinfo

.PHONY: type-check
type-check:
	pnpm -r type-check

.PHONY: run-dev
run-dev:
	pnpm run dev:start
