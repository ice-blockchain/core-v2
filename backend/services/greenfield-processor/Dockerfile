FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/greenfield-processor/package.json ./services/greenfield-processor/

RUN pnpm install --filter greenfield-processor --frozen-lockfile

COPY services/greenfield-processor/tsconfig.json ./services/greenfield-processor/
COPY services/greenfield-processor/src/ ./services/greenfield-processor/src/

RUN pnpm --filter greenfield-processor build
RUN pnpm --filter greenfield-processor deploy --prod --legacy /app

FROM node:22-alpine

RUN addgroup -S processor && adduser -S processor -G processor \
    && mkdir -p /tmp/greenfield-processor && chown processor:processor /tmp/greenfield-processor \
    && chmod 700 /tmp/greenfield-processor

WORKDIR /app
COPY --from=builder /app ./

USER processor
EXPOSE 3001

CMD ["node", "dist/server.js"]
