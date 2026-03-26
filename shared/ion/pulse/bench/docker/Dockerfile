FROM node:20-alpine

WORKDIR /app/pulse

RUN npm install -g tsx@4.21.0

RUN mkdir -p /app/deps && cd /app/deps && \
    npm init -y > /dev/null 2>&1 && \
    npm install --ignore-scripts yjs@^13.6.24 y-protocols@^1.0.6 \
    @noble/hashes@^1.7.2 lru-cache@^11.1.0 2>&1 | tail -2

COPY graph/src/ graph/src/
COPY graph/tsconfig.json graph/tsconfig.json
COPY sync/src/ sync/src/
COPY sync/tsconfig.json sync/tsconfig.json
COPY signal/src/ signal/src/
COPY signal/tsconfig.json signal/tsconfig.json
COPY shard/src/ shard/src/
COPY shard/tsconfig.json shard/tsconfig.json
COPY cache/src/ cache/src/
COPY cache/tsconfig.json cache/tsconfig.json
COPY reaper/src/ reaper/src/
COPY reaper/tsconfig.json reaper/tsconfig.json
COPY store/src/ store/src/
COPY store/tsconfig.json store/tsconfig.json
COPY bench/src/ bench/src/
COPY bench/tsconfig.json bench/tsconfig.json
COPY tsconfig.base.json tsconfig.base.json

RUN for dir in graph sync signal shard cache reaper store bench; do \
      mkdir -p $dir/node_modules && \
      ln -s /app/deps/node_modules/* $dir/node_modules/ 2>/dev/null; \
    done

EXPOSE 3000

CMD ["tsx", "bench/src/relay-http-server.ts"]
