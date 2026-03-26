# Pulse Shard

Consistent hashing ring for distributed shard routing across relay servers.

## Dependencies
- `@noble/hashes` (SHA-256 for soul hashing)

## API Surface
- `createPulseShardRing(config)` -- create consistent hashing ring
  - `getShardOwners(soul)` -- returns N relay peer IDs for this soul's shard
  - `isLocalShard(soul)` -- check if this relay owns the shard
  - `addRelay(peerId)` / `removeRelay(peerId)` -- update ring membership
- Config: `minReplicas` (default: 3), `maxReplicas` (default: 5), `repairThreshold` (default: 60s)

## Design Decisions
- SHA-256 hash of soul determines shard placement on the ring
- Replication factor bounded: minReplicas to maxReplicas
- Health monitor pings shard partners; marks degraded after repairThreshold
- Replica repair: stream shard to lowest-load healthy peer
- Anti-entropy sweep: Merkle tree hash comparison between replica holders
