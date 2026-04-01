FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

COPY services/ion-connect-storage/ ./services/ion-connect-storage/

WORKDIR /build/services/ion-connect-storage

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /ion-connect-storage ./cmd

FROM alpine:3.21

RUN apk add --no-cache ca-certificates \
    && addgroup -S storage \
    && adduser -S storage -G storage \
    && mkdir -p /data/cache /data/db \
    && chown -R storage:storage /data

COPY --from=builder /ion-connect-storage /usr/local/bin/ion-connect-storage

USER storage

ENTRYPOINT ["ion-connect-storage"]
