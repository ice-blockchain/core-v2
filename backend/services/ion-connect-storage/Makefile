MODULE   := ion-connect-storage
BINARY   := ion-connect-storage

.PHONY: build test test-e2e vet fmt clean up

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY) ./cmd

test:
	go tool gotestsum -f github-actions --rerun-fails=3 --packages="./..." -- -timeout 5m -count=1 -cover -covermode atomic

test-e2e:
	go tool gotestsum -f github-actions --rerun-fails=3 --packages="./..." --rerun-fails-run-root-test -- -timeout 120s -tags e2e -v

vet:
	go vet ./...

fmt:
	gofmt -s -w .

clean:
	rm -f $(BINARY)

up:
	docker compose up --build $(MODULE)
