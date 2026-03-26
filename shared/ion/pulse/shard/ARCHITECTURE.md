# Pulse Shard

## Purpose
Consistent hashing ring for distributing graph data across relay servers.

## API
- `createPulseShardRing(config?)` -- create ring
- `addRelay(relayId)` -- add relay with virtual nodes
- `removeRelay(relayId)` -- remove relay
- `getShardOwners(soul)` -- get N responsible relays
- `isLocalShard(soul, localRelayId)` -- check ownership

## Algorithm
SHA-256 hash of soul/relayId mapped to 32-bit ring positions. Virtual nodes (default: 150) ensure even distribution. Owners selected by walking clockwise from soul's position.

## Config
- `virtualNodes` (default: 150)
- `minReplicas` (default: 3)
- `maxReplicas` (default: 5)
- `repairThresholdMs` (default: 60000)

## Dependencies
- `@noble/hashes` -- SHA-256

## Status
Implemented. Health monitor and replica repair pending (requires Pulse Mesh integration).
