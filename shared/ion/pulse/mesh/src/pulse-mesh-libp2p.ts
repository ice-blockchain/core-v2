import { createLibp2p } from 'libp2p';
import type { Libp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { identify } from '@libp2p/identify';
import { kadDHT } from '@libp2p/kad-dht';
import {
  circuitRelayTransport,
  circuitRelayServer,
} from '@libp2p/circuit-relay-v2';
import { multiaddr } from '@multiformats/multiaddr';
import type {
  PulseMeshConfig,
  PulseMeshMessage,
  PulseMeshMessageHandler,
  PulseMeshNode,
} from './types';

interface Libp2pServices {
  readonly identify: unknown;
  readonly pubsub: GossipSubInstance;
  readonly dht?: unknown;
  readonly relay?: unknown;
}

interface GossipSubInstance {
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(
    topic: string,
    data: Uint8Array,
  ): Promise<{ recipients: unknown[] }>;
  getTopics(): string[];
  getPeers(): unknown[];
  addEventListener(
    event: string,
    handler: (evt: MessageEvent) => void,
  ): void;
  removeEventListener(
    event: string,
    handler: (evt: MessageEvent) => void,
  ): void;
}

interface MessageEvent {
  readonly detail: {
    readonly topic: string;
    readonly data: Uint8Array;
    readonly from: { toString(): string };
  };
}

interface Libp2pNodeState {
  node: Libp2p<Libp2pServices> | null;
  topicHandlers: Map<string, Set<PulseMeshMessageHandler>>;
  messageListener: ((evt: MessageEvent) => void) | null;
}

function buildTransports(config: PulseMeshConfig): unknown[] {
  const transports: unknown[] = [tcp()];
  if (config.platform === 'server') {
    transports.push(webSockets());
  }
  if (config.relayMode) {
    transports.push(circuitRelayTransport());
  }
  return transports;
}

function buildServices(
  config: PulseMeshConfig,
): Record<string, unknown> {
  const services: Record<string, unknown> = {
    identify: identify(),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
      floodPublish: true,
    }),
  };
  if (config.enableDht) {
    services.dht = kadDHT();
  }
  if (config.relayMode) {
    services.relay = circuitRelayServer();
  }
  return services;
}

function resolveListenAddresses(config: PulseMeshConfig): string[] {
  if (config.listenAddresses?.length) {
    return config.listenAddresses;
  }
  return ['/ip4/0.0.0.0/tcp/0'];
}

async function initializeLibp2pNode(
  config: PulseMeshConfig,
): Promise<Libp2p<Libp2pServices>> {
  return createLibp2p({
    addresses: { listen: resolveListenAddresses(config) },
    transports: buildTransports(config),
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionManager: {
      maxConnections: config.maxConnections ?? 50,
    },
    services: buildServices(config),
  }) as Promise<Libp2p<Libp2pServices>>;
}

async function dialBootstrapPeers(
  node: Libp2p<Libp2pServices>,
  peers: string[],
): Promise<void> {
  const dialPromises = peers.map(async (addr) => {
    try {
      type DialTarget = Parameters<typeof node.dial>[0];
      await node.dial(multiaddr(addr) as DialTarget);
    } catch {
      // Bootstrap peer unreachable -- non-fatal
    }
  });
  await Promise.allSettled(dialPromises);
}

function createMessageDispatcher(
  topicHandlers: Map<string, Set<PulseMeshMessageHandler>>,
): (evt: MessageEvent) => void {
  return (evt: MessageEvent) => {
    const { topic, data, from } = evt.detail;
    const handlers = topicHandlers.get(topic);
    if (!handlers) return;

    const message: PulseMeshMessage = {
      topic,
      data,
      from: from.toString(),
    };
    for (const handler of handlers) {
      handler(message);
    }
  };
}

function attachSubscription(
  state: Libp2pNodeState,
  topic: string,
  handler: PulseMeshMessageHandler,
): () => void {
  if (!state.node) throw new Error('Node is not running');
  if (!state.topicHandlers.has(topic)) {
    state.topicHandlers.set(topic, new Set());
    state.node.services.pubsub.subscribe(topic);
  }
  state.topicHandlers.get(topic)!.add(handler);
  return buildUnsubscribe(state, topic, handler);
}

function buildUnsubscribe(
  state: Libp2pNodeState,
  topic: string,
  handler: PulseMeshMessageHandler,
): () => void {
  return () => {
    const handlers = state.topicHandlers.get(topic);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      state.topicHandlers.delete(topic);
      state.node?.services.pubsub.unsubscribe(topic);
    }
  };
}

async function startNode(
  config: PulseMeshConfig,
  state: Libp2pNodeState,
): Promise<void> {
  if (state.node) return;
  state.node = await initializeLibp2pNode(config);
  state.messageListener = createMessageDispatcher(state.topicHandlers);
  state.node.services.pubsub.addEventListener(
    'message',
    state.messageListener,
  );
  await state.node.start();
  if (config.bootstrapPeers?.length) {
    await dialBootstrapPeers(state.node, config.bootstrapPeers);
  }
}

async function stopNode(state: Libp2pNodeState): Promise<void> {
  if (!state.node) return;
  if (state.messageListener) {
    state.node.services.pubsub.removeEventListener(
      'message',
      state.messageListener,
    );
  }
  await state.node.stop();
  state.topicHandlers.clear();
  state.node = null;
  state.messageListener = null;
}

export function createLibp2pMeshNode(
  config: PulseMeshConfig,
): PulseMeshNode {
  const state: Libp2pNodeState = {
    node: null,
    topicHandlers: new Map(),
    messageListener: null,
  };

  return {
    start: () => startNode(config, state),
    stop: () => stopNode(state),
    publish: async (topic: string, data: Uint8Array) => {
      if (!state.node) throw new Error('Node is not running');
      await state.node.services.pubsub.publish(topic, data);
    },
    subscribe: (topic: string, handler: PulseMeshMessageHandler) =>
      attachSubscription(state, topic, handler),
    getPeerId: () => (state.node ? state.node.peerId.toString() : ''),
    getPeerCount: () => (state.node ? state.node.getPeers().length : 0),
    getMultiaddrs: () => {
      if (!state.node) return [];
      return state.node.getMultiaddrs().map((ma) => ma.toString());
    },
  };
}
