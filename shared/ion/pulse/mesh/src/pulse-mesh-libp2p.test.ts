import { describe, it, expect, afterEach } from 'vitest';
import { createLibp2pMeshNode } from './pulse-mesh-libp2p';
import { createPulseMeshNode } from './pulse-mesh';
import type { PulseMeshMessage, PulseMeshNode } from './types';

const MESH_SETTLE_MS = 3000;
const MESSAGE_DELIVERY_MS = 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createServerNode(
  overrides: { bootstrapPeers?: string[] } = {},
): PulseMeshNode {
  return createLibp2pMeshNode({
    platform: 'server',
    listenAddresses: ['/ip4/127.0.0.1/tcp/0'],
    ...overrides,
  });
}

describe('libp2p mesh', () => {
  const runningNodes: PulseMeshNode[] = [];

  afterEach(async () => {
    await Promise.all(runningNodes.map((n) => n.stop()));
    runningNodes.length = 0;
  });

  it('assigns a unique peer ID to each node', async () => {
    const nodeA = createServerNode();
    const nodeB = createServerNode();
    await nodeA.start();
    await nodeB.start();
    runningNodes.push(nodeA, nodeB);

    expect(nodeA.getPeerId()).toBeTruthy();
    expect(nodeB.getPeerId()).toBeTruthy();
    expect(nodeA.getPeerId()).not.toBe(nodeB.getPeerId());
  });

  it('exposes multiaddrs after start', async () => {
    const node = createServerNode();
    await node.start();
    runningNodes.push(node);

    const addrs = node.getMultiaddrs();
    expect(addrs.length).toBeGreaterThan(0);
    expect(addrs[0]).toContain('/ip4/127.0.0.1/tcp/');
  });

  it('stops node and clears state properly', async () => {
    const node = createServerNode();
    await node.start();

    const peerId = node.getPeerId();
    expect(peerId).toBeTruthy();

    await node.stop();
    expect(node.getPeerId()).toBe('');
    expect(node.getPeerCount()).toBe(0);
    expect(node.getMultiaddrs()).toHaveLength(0);
  });

  it('throws when publishing on a stopped node', async () => {
    const node = createServerNode();
    const data = new TextEncoder().encode('hello');
    await expect(node.publish('topic', data)).rejects.toThrow(
      'Node is not running',
    );
  });

  it('throws when subscribing on a stopped node', () => {
    const node = createServerNode();
    expect(() => node.subscribe('topic', () => {})).toThrow(
      'Node is not running',
    );
  });

  it('defaults to in-memory when no platform specified', async () => {
    const node = createPulseMeshNode({});
    await node.start();
    expect(node.getPeerId()).toBeTruthy();
    await node.stop();
  });
}, 30_000);

describe('libp2p mesh connectivity', () => {
  const runningNodes: PulseMeshNode[] = [];

  afterEach(async () => {
    await Promise.all(runningNodes.map((n) => n.stop()));
    runningNodes.length = 0;
  });

  it('delivers messages between bootstrapped peers', async () => {
    const nodeA = createServerNode();
    await nodeA.start();
    runningNodes.push(nodeA);

    const bootstrapAddr = nodeA.getMultiaddrs()[0];

    const nodeB = createServerNode({
      bootstrapPeers: [bootstrapAddr],
    });
    await nodeB.start();
    runningNodes.push(nodeB);

    await wait(MESH_SETTLE_MS);

    expect(nodeA.getPeerCount()).toBe(1);
    expect(nodeB.getPeerCount()).toBe(1);

    const received: PulseMeshMessage[] = [];
    nodeA.subscribe('events', (msg) => received.push(msg));
    nodeB.subscribe('events', () => {});
    await wait(MESH_SETTLE_MS);

    const payload = new TextEncoder().encode('hello from B');
    await nodeB.publish('events', payload);
    await wait(MESSAGE_DELIVERY_MS);

    expect(received).toHaveLength(1);
    expect(received[0].topic).toBe('events');
    expect(new TextDecoder().decode(received[0].data)).toBe(
      'hello from B',
    );
    expect(received[0].from).toBe(nodeB.getPeerId());
  });

  it('unsubscribe stops message delivery', async () => {
    const nodeA = createServerNode();
    await nodeA.start();
    runningNodes.push(nodeA);

    const nodeB = createServerNode({
      bootstrapPeers: [nodeA.getMultiaddrs()[0]],
    });
    await nodeB.start();
    runningNodes.push(nodeB);

    await wait(MESH_SETTLE_MS);

    const received: PulseMeshMessage[] = [];
    const unsubscribe = nodeA.subscribe('chat', (msg) => {
      received.push(msg);
    });
    nodeB.subscribe('chat', () => {});
    await wait(MESH_SETTLE_MS);

    await nodeB.publish(
      'chat',
      new TextEncoder().encode('first'),
    );
    await wait(MESSAGE_DELIVERY_MS);
    expect(received).toHaveLength(1);

    unsubscribe();

    await nodeB.publish(
      'chat',
      new TextEncoder().encode('second'),
    );
    await wait(MESSAGE_DELIVERY_MS);
    expect(received).toHaveLength(1);
  });
}, 60_000);
