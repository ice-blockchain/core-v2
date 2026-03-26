import type {
  PulseMeshConfig,
  PulseMeshMessage,
  PulseMeshMessageHandler,
  PulseMeshNode,
} from './types';

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
  const message: PulseMeshMessage = {
    topic,
    data,
    from: fromPeerId,
  };

  for (const [peerId, entry] of meshRegistry) {
    if (peerId === fromPeerId) continue;
    const handlers = entry.subscriptions.get(topic);
    if (!handlers) continue;
    for (const handler of handlers) {
      handler(message);
    }
  }
}

function createSubscriptionHandler(
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

export function createPulseMeshNode(
  config: PulseMeshConfig,
): PulseMeshNode {
  const peerId = generatePeerId();
  const maxConnections = config.maxConnections ?? 50;
  let isRunning = false;

  const entry: MeshRegistryEntry = {
    peerId,
    subscriptions: new Map(),
  };

  const start = async (): Promise<void> => {
    if (isRunning) return;
    meshRegistry.set(peerId, entry);
    isRunning = true;
  };

  const stop = async (): Promise<void> => {
    if (!isRunning) return;
    meshRegistry.delete(peerId);
    entry.subscriptions.clear();
    isRunning = false;
  };

  const publish = async (
    topic: string,
    data: Uint8Array,
  ): Promise<void> => {
    if (!isRunning) {
      throw new Error('Node is not running');
    }
    broadcastToTopic(topic, data, peerId);
  };

  const subscribe = (
    topic: string,
    handler: PulseMeshMessageHandler,
  ): (() => void) => {
    if (!isRunning) {
      throw new Error('Node is not running');
    }
    return createSubscriptionHandler(entry, topic, handler);
  };

  const getPeerId = (): string => peerId;

  const getPeerCount = (): number => {
    if (!isRunning) return 0;
    const otherPeers = meshRegistry.size - 1;
    return Math.min(otherPeers, maxConnections);
  };

  return {
    start,
    stop,
    publish,
    subscribe,
    getPeerId,
    getPeerCount,
  };
}

export function clearMeshRegistry(): void {
  meshRegistry.clear();
}
