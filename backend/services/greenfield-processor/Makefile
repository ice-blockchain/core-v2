MODULE   := greenfield-processor
BINARY   := dist

.PHONY: build test test-e2e vet fmt clean up

build:
	pnpm build

test:
	pnpm test

test-e2e:
	pnpm vitest run --test-timeout 120000 'e2e'

vet:
	pnpm type-check

fmt:
	pnpm lint --fix

clean:
	rm -rf $(BINARY)

up:
	docker compose -f ../docker-compose.yml up --build $(MODULE)-1 $(MODULE)-2
