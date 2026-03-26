import type {
  PulseMeshConfig,
  PulseMeshMessage,
  PulseMeshMessageHandler,
  PulseMeshNode,
} from './types';
import { createLibp2pMeshNode } from './pulse-mesh-libp2p';

interface MeshRegistryEntry {
  readonly peerId: string;
  readonly subscriptions: Map<string, Set<PulseMeshMessageHandler>>;
}

const meshRegistry = new Map<string, MeshRegistryEntry>();

function generatePeerId(): string {
  const segments = [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ];
  return segments.join('-');
}

function broadcastToTopic(
  topic: string,
  data: Uint8Array,
  fromPeerId: string,
): void {
  const message: PulseMeshMessage = { topic, data, from: fromPeerId };

  for (const [peerId, entry] of meshRegistry) {
    if (peerId === fromPeerId) continue;
    const handlers = entry.subscriptions.get(topic);
    if (!handlers) continue;
    for (const handler of handlers) {
      handler(message);
    }
  }
}

function createUnsubscribe(
  entry: MeshRegistryEntry,
  topic: string,
  handler: PulseMeshMessageHandler,
): () => void {
  if (!entry.subscriptions.has(topic)) {
    entry.subscriptions.set(topic, new Set());
  }
  entry.subscriptions.get(topic)!.add(handler);

  return () => {
    const handlers = entry.subscriptions.get(topic);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      entry.subscriptions.delete(topic);
    }
  };
}

interface InMemoryNodeState {
  readonly peerId: string;
  readonly entry: MeshRegistryEntry;
  readonly maxConnections: number;
  isRunning: boolean;
}

function buildInMemoryLifecycle(state: InMemoryNodeState) {
  return {
    start: async () => {
      if (state.isRunning) return;
      meshRegistry.set(state.peerId, state.entry);
      state.isRunning = true;
    },
    stop: async () => {
      if (!state.isRunning) return;
      meshRegistry.delete(state.peerId);
      state.entry.subscriptions.clear();
      state.isRunning = false;
    },
  };
}

function buildInMemoryMessaging(state: InMemoryNodeState) {
  return {
    publish: async (topic: string, data: Uint8Array) => {
      if (!state.isRunning) throw new Error('Node is not running');
      broadcastToTopic(topic, data, state.peerId);
    },
    subscribe: (topic: string, handler: PulseMeshMessageHandler) => {
      if (!state.isRunning) throw new Error('Node is not running');
      return createUnsubscribe(state.entry, topic, handler);
    },
  };
}

function buildInMemoryNode(config: PulseMeshConfig): PulseMeshNode {
  const peerId = generatePeerId();
  const state: InMemoryNodeState = {
    peerId,
    entry: { peerId, subscriptions: new Map() },
    maxConnections: config.maxConnections ?? 50,
    isRunning: false,
  };

  const lifecycle = buildInMemoryLifecycle(state);
  const messaging = buildInMemoryMessaging(state);

  return {
    ...lifecycle,
    ...messaging,
    getPeerId: () => state.peerId,
    getPeerCount: () => {
      if (!state.isRunning) return 0;
      return Math.min(meshRegistry.size - 1, state.maxConnections);
    },
    getMultiaddrs: () => [],
  };
}

export function createInMemoryMeshNode(
  config: PulseMeshConfig = {},
): PulseMeshNode {
  return buildInMemoryNode(config);
}

export function createPulseMeshNode(
  config: PulseMeshConfig = {},
): PulseMeshNode {
  if (!config.platform) {
    return buildInMemoryNode(config);
  }
  return createLibp2pMeshNode(config);
}

export function clearMeshRegistry(): void {
  meshRegistry.clear();
}
