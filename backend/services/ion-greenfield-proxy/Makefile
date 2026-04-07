MODULE   := ion-greenfield-proxy
BINARY   := ion-greenfield-proxy

.PHONY: build test clean fmt vet up swagger

build:
	CGO_ENABLED=1 go build -ldflags="-linkmode external -extldflags '-static'" -v -o $(BINARY) ./cmd/server

test:
	go tool gotestsum -f github-actions --rerun-fails=3 --packages="./..." --rerun-fails-run-root-test -- -timeout 20m -tags test -cover -covermode atomic

vet:
	go vet ./...

fmt:
	gofmt -w .

clean:
	rm -f $(BINARY)

swagger:
	go tool swag init -g ./cmd/server/main.go -o ./internal/router/docs --outputTypes go,json --parseDependency --parseInternal

up:
	go get -v -u ./...
