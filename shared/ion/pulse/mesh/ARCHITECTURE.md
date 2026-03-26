# Pulse Mesh

## Purpose
P2P transport layer. In production: libp2p with GossipSub, Circuit Relay v2, Kademlia DHT.

## API
- `createPulseMeshNode(config)` -- create mesh node
- `start()` / `stop()` -- lifecycle
- `publish(topic, data)` -- broadcast to topic subscribers
- `subscribe(topic, handler)` -- listen on topic, returns unsubscribe

## Platform Transports (planned)
- Server: TCP + WebSocket + QUIC
- Browser: WebSocket + WebTransport + WebRTC
- React Native: WebSocket

## Dependencies
- Currently: in-memory mesh for testing
- Planned: `libp2p`, `@chainsafe/libp2p-gossipsub`, `@libp2p/kad-dht`

## Status
In-memory mesh implemented for development/testing. libp2p integration pending.
