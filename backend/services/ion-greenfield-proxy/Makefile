MODULE   := ion-greenfield-proxy
BINARY   := ion-greenfield-proxy

.PHONY: build test clean fmt vet

build:
	CGO_ENABLED=0 go build -v -o $(BINARY) ./cmd/server

test:
	go tool gotestsum -f github-actions --rerun-fails=3 --packages="./..." --rerun-fails-run-root-test -- -timeout 20m -tags test -cover -covermode atomic

vet:
	go vet ./...

fmt:
	gofmt -w .

clean:
	rm -f $(BINARY)
