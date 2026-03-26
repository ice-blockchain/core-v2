# Pulse Mesh

## Purpose
P2P transport layer using libp2p with GossipSub for pub/sub messaging.

## API
- `createPulseMeshNode(config)` -- factory: returns in-memory (no platform) or libp2p node
- `createInMemoryMeshNode(config)` -- in-memory mesh for unit testing
- `createLibp2pMeshNode(config)` -- real libp2p node with GossipSub
- `start()` / `stop()` -- lifecycle
- `publish(topic, data)` -- broadcast to topic subscribers
- `subscribe(topic, handler)` -- listen on topic, returns unsubscribe
- `getPeerId()` -- returns peer ID string
- `getPeerCount()` -- returns connected peer count
- `getMultiaddrs()` -- returns listen addresses for peer discovery

## Platform Transports
- Server: TCP + WebSocket
- Browser: WebSocket (planned)
- React Native: WebSocket (planned)

## libp2p Stack
- **Transport**: TCP (`@libp2p/tcp`), WebSocket (`@libp2p/websockets`)
- **Encryption**: Noise (`@chainsafe/libp2p-noise`)
- **Muxer**: Yamux (`@chainsafe/libp2p-yamux`)
- **PubSub**: GossipSub (`@chainsafe/libp2p-gossipsub`)
- **Discovery**: Kademlia DHT (`@libp2p/kad-dht`, optional)
- **Relay**: Circuit Relay v2 (`@libp2p/circuit-relay-v2`, optional)
- **Identity**: Identify protocol (`@libp2p/identify`)

## File Structure
- `pulse-mesh.ts` -- factory function, in-memory implementation
- `pulse-mesh-libp2p.ts` -- libp2p implementation
- `types.ts` -- shared type definitions
- `pulse-mesh.test.ts` -- in-memory mesh tests
- `pulse-mesh-libp2p.test.ts` -- libp2p integration tests

## Status
In-memory mesh for development/testing. libp2p integration implemented for server platform.
