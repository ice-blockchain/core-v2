FROM golang:1.26.1-alpine AS builder

RUN apk add --no-cache git ca-certificates build-base

WORKDIR /build

COPY packages/greenfield-client/ ./packages/greenfield-client/
COPY services/greenfield-ingester/ ./services/greenfield-ingester/

WORKDIR /build/services/greenfield-ingester

RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w -extldflags '-static'" -o /greenfield-ingester ./cmd

FROM alpine:3.21

RUN apk add --no-cache ca-certificates \
    && addgroup -S ingester \
    && adduser -S ingester -G ingester

COPY --from=builder /greenfield-ingester /usr/local/bin/greenfield-ingester

USER ingester

ENTRYPOINT ["greenfield-ingester"]
