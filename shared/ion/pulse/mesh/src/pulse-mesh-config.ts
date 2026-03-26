import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import type { PulseMeshConfig } from './types.js';

const DEFAULT_SERVER_ADDRESSES = ['/ip4/0.0.0.0/tcp/0', '/ip4/0.0.0.0/tcp/0/ws'];
const DEFAULT_SERVER_MAX_CONNECTIONS = 100;
const DEFAULT_BROWSER_MAX_CONNECTIONS = 20;
const DEFAULT_REACT_NATIVE_MAX_CONNECTIONS = 10;

export function buildServerConfig(config: PulseMeshConfig) {
  return {
    transports: [tcp(), webSockets(), circuitRelayTransport()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub(),
      relay: circuitRelayServer(),
    },
    connectionManager: {
      maxConnections: config.maxConnections ?? DEFAULT_SERVER_MAX_CONNECTIONS,
    },
    addresses: {
      listen: config.listenAddresses ?? DEFAULT_SERVER_ADDRESSES,
    },
    ...(config.bootstrapPeers?.length
      ? { peerDiscovery: [bootstrap({ list: config.bootstrapPeers })] }
      : {}),
  };
}

export function buildBrowserConfig(config: PulseMeshConfig) {
  return {
    transports: [webSockets(), circuitRelayTransport()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub(),
    },
    connectionManager: {
      maxConnections: config.maxConnections ?? DEFAULT_BROWSER_MAX_CONNECTIONS,
    },
    addresses: {
      listen: config.listenAddresses ?? [],
    },
    ...(config.bootstrapPeers?.length
      ? { peerDiscovery: [bootstrap({ list: config.bootstrapPeers })] }
      : {}),
  };
}

export function buildReactNativeConfig(config: PulseMeshConfig) {
  return {
    transports: [webSockets(), circuitRelayTransport()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub(),
    },
    connectionManager: {
      maxConnections: config.maxConnections ?? DEFAULT_REACT_NATIVE_MAX_CONNECTIONS,
    },
    addresses: {
      listen: config.listenAddresses ?? [],
    },
    ...(config.bootstrapPeers?.length
      ? { peerDiscovery: [bootstrap({ list: config.bootstrapPeers })] }
      : {}),
  };
}

export function buildPulseMeshConfig(config: PulseMeshConfig) {
  if (config.platform === 'server') {
    return buildServerConfig(config);
  }

  if (config.platform === 'browser') {
    return buildBrowserConfig(config);
  }

  return buildReactNativeConfig(config);
}
