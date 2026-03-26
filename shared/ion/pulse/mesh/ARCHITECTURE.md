# Pulse Mesh

P2P transport layer using libp2p. Manages peer connections, GossipSub topics, and relay routing.

## Dependencies
- `libp2p` -- GossipSub, Circuit Relay v2, Kademlia DHT, Noise encryption

## API Surface
- `createPulseMesh(config)` -- create a libp2p node with platform-appropriate transports
- `publishPulseMessage(topic, data)` -- broadcast via GossipSub
- `subscribePulseTopic(topic, handler)` -- subscribe to GossipSub topic
- `requestPulseData(peerId, request)` -- direct request-response to a specific peer

## Platform Configs
- Server: TCP + WebSocket + QUIC, high connection limit, Circuit Relay v2 server, DHT bootstrap
- Browser: WebSocket + WebTransport + WebRTC, Circuit Relay v2 client, DHT client
- React Native: WebSocket only, Circuit Relay v2 client, DHT client

## Design Decisions
- GossipSub for topic-based broadcast with built-in dedup
- Circuit Relay v2 for NAT traversal
- Kademlia DHT for peer discovery and shard routing
- Yjs sync messages piped directly over GossipSub as Uint8Array
