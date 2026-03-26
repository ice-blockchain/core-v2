# Pulse Mesh

P2P transport via libp2p with platform-specific configurations.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseMesh` | function | Creates a libp2p mesh node with topic-based pub/sub |
| `encodePulseMessage` | function | Encodes a PulseMessage into a compact binary format |
| `decodePulseMessage` | function | Decodes a binary buffer back into a PulseMessage |
| `createRelayConfig` | function | Builds libp2p config for relay servers (TCP + WebSocket) |
| `createBrowserConfig` | function | Builds libp2p config for browser peers (WebSocket + WebRTC) |
| `createMobileConfig` | function | Builds libp2p config for React Native peers |
| `PulseMesh` | type | Mesh instance with publish/subscribe/peers operations |
| `PulseMessage` | type | Typed message envelope with topic, payload, and sender |

## Dependencies

- `libp2p` -- core P2P networking stack
- `@chainsafe/libp2p-gossipsub` -- GossipSub for topic-based pub/sub
- `@libp2p/circuit-relay-v2` -- Circuit Relay for NAT traversal
- `@libp2p/kad-dht` -- Kademlia DHT for peer discovery
- `@libp2p/webrtc` -- WebRTC transport for browser peers
- `@libp2p/websockets` -- WebSocket transport for cross-platform connectivity

## Design Decisions

- GossipSub for pub/sub -- efficient epidemic broadcast with mesh overlay; peers only forward messages to a subset of subscribers
- Circuit Relay for NAT traversal -- peers behind NATs connect through relay servers rather than requiring port forwarding
- Binary message codec -- custom compact encoding rather than JSON to reduce bandwidth on mobile networks
- Platform-specific config builders -- each platform (server, browser, mobile) has different transport capabilities; config builders abstract this
