import { createLibp2p } from 'libp2p';
import type { Libp2p } from 'libp2p';
import { buildPulseMeshConfig } from './pulse-mesh-config.js';
import { encodePulseMessage, decodePulseMessage } from './pulse-message-codec.js';
import type { PulseMesh, PulseMeshConfig, PulseMessage, PulseMessageHandler } from './types.js';

interface TopicSubscription {
  handlers: Set<PulseMessageHandler>;
  unsubscribe: (() => void) | null;
}

function createSubscriptionMap(): Map<string, TopicSubscription> {
  return new Map();
}

function ensureTopicSubscription(
  subscriptions: Map<string, TopicSubscription>,
  topic: string,
): TopicSubscription {
  const existing = subscriptions.get(topic);
  if (existing) {
    return existing;
  }

  const subscription: TopicSubscription = { handlers: new Set(), unsubscribe: null };
  subscriptions.set(topic, subscription);
  return subscription;
}

function handleIncomingMessage(subscriptions: Map<string, TopicSubscription>) {
  return (event: CustomEvent) => {
    const { topic, data } = event.detail;
    const subscription = subscriptions.get(topic);
    if (!subscription) {
      return;
    }

    const message = decodePulseMessage(data);
    for (const handler of subscription.handlers) {
      handler(message);
    }
  };
}

export function createPulseMesh(config: PulseMeshConfig): PulseMesh {
  let node: Libp2p | null = null;
  let started = false;
  const subscriptions = createSubscriptionMap();
  const libp2pConfig = buildPulseMeshConfig(config);

  async function start(): Promise<void> {
    if (started) {
      return;
    }

    node = await createLibp2p(libp2pConfig);
    await node.start();
    started = true;
  }

  async function stop(): Promise<void> {
    if (!node || !started) {
      return;
    }

    await node.stop();
    started = false;
    subscriptions.clear();
  }

  async function publish(topic: string, message: PulseMessage): Promise<void> {
    if (!node || !started) {
      throw new Error('Mesh node is not started');
    }

    const encoded = encodePulseMessage(message);
    const pubsub = node.services['pubsub'] as { publish: (topic: string, data: Uint8Array) => Promise<void> };
    await pubsub.publish(topic, encoded);
  }

  function subscribe(topic: string, handler: PulseMessageHandler): () => void {
    const subscription = ensureTopicSubscription(subscriptions, topic);
    subscription.handlers.add(handler);

    if (node && started && !subscription.unsubscribe) {
      setupGossipSubscription(node, topic, subscriptions);
    }

    return () => {
      subscription.handlers.delete(handler);
    };
  }

  function getPeerId(): string {
    if (!node) {
      throw new Error('Mesh node is not started');
    }
    return node.peerId.toString();
  }

  function getConnectedPeers(): string[] {
    if (!node) {
      return [];
    }
    return node.getPeers().map((peer) => peer.toString());
  }

  function isStarted(): boolean {
    return started;
  }

  return { start, stop, publish, subscribe, getPeerId, getConnectedPeers, isStarted };
}

function setupGossipSubscription(
  node: Libp2p,
  topic: string,
  subscriptions: Map<string, TopicSubscription>,
): void {
  const pubsub = node.services['pubsub'] as {
    subscribe: (topic: string) => void;
    addEventListener: (event: string, handler: (event: CustomEvent) => void) => void;
  };

  pubsub.subscribe(topic);
  pubsub.addEventListener('message', handleIncomingMessage(subscriptions));
}
