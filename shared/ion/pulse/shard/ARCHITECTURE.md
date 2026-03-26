# Pulse Shard

Consistent hashing ring for shard routing and replica management.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseShard` | function | Creates a shard ring with configurable virtual nodes and replica count |
| `PulseShard` | type | Shard ring with addPeer/removePeer/getOwners/rebalance operations |
| `ShardPeer` | type | Peer entry with id, address, and health status |
| `ShardConfig` | type | Configuration (virtualNodes, minReplicas, healthCheckInterval) |

## Dependencies

- `@noble/hashes` -- SHA-256 for deterministic hash ring positioning

## Design Decisions

- 150 virtual nodes per peer -- high virtual node count ensures even key distribution across peers; 150 balances memory overhead vs distribution uniformity
- Clockwise walk for replicas -- replica owners are the next N distinct physical peers clockwise from the key's position on the ring
- Health tracking -- peers have health status (healthy/suspect/dead); routing skips dead peers and promotes the next healthy peer
- Deterministic ring -- same peer set always produces the same ring; no coordination needed between nodes to agree on ownership
