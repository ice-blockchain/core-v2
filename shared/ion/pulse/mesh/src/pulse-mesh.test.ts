import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPulseMeshNode,
  createInMemoryMeshNode,
  clearMeshRegistry,
} from './pulse-mesh';
import type { PulseMeshMessage } from './types';

describe('in-memory mesh', () => {
  beforeEach(() => {
    clearMeshRegistry();
  });

  it('allows two nodes to publish and subscribe on the same topic', async () => {
    const nodeA = createInMemoryMeshNode({});
    const nodeB = createInMemoryMeshNode({});
    await nodeA.start();
    await nodeB.start();

    const received: PulseMeshMessage[] = [];
    nodeB.subscribe('chat', (message) => {
      received.push(message);
    });

    const data = new TextEncoder().encode('hello');
    await nodeA.publish('chat', data);

    expect(received).toHaveLength(1);
    expect(received[0].topic).toBe('chat');
    expect(received[0].from).toBe(nodeA.getPeerId());
    expect(new TextDecoder().decode(received[0].data)).toBe('hello');

    await nodeA.stop();
    await nodeB.stop();
  });

  it('does not deliver messages across different topics', async () => {
    const nodeA = createInMemoryMeshNode({});
    const nodeB = createInMemoryMeshNode({});
    await nodeA.start();
    await nodeB.start();

    const received: PulseMeshMessage[] = [];
    nodeB.subscribe('chat', (message) => {
      received.push(message);
    });

    const data = new TextEncoder().encode('secret');
    await nodeA.publish('events', data);

    expect(received).toHaveLength(0);

    await nodeA.stop();
    await nodeB.stop();
  });

  it('stops receiving messages after unsubscribe', async () => {
    const nodeA = createInMemoryMeshNode({});
    const nodeB = createInMemoryMeshNode({});
    await nodeA.start();
    await nodeB.start();

    const received: PulseMeshMessage[] = [];
    const unsubscribe = nodeB.subscribe('chat', (message) => {
      received.push(message);
    });

    await nodeA.publish('chat', new TextEncoder().encode('first'));
    expect(received).toHaveLength(1);

    unsubscribe();

    await nodeA.publish('chat', new TextEncoder().encode('second'));
    expect(received).toHaveLength(1);

    await nodeA.stop();
    await nodeB.stop();
  });

  it('removes node from mesh after stop', async () => {
    const nodeA = createInMemoryMeshNode({});
    const nodeB = createInMemoryMeshNode({});
    await nodeA.start();
    await nodeB.start();

    expect(nodeA.getPeerCount()).toBe(1);

    await nodeB.stop();

    expect(nodeA.getPeerCount()).toBe(0);

    await nodeA.stop();
  });

  it('reflects actual peer count from getPeerCount', async () => {
    const nodeA = createInMemoryMeshNode({});
    const nodeB = createInMemoryMeshNode({});
    const nodeC = createInMemoryMeshNode({});

    await nodeA.start();
    expect(nodeA.getPeerCount()).toBe(0);

    await nodeB.start();
    expect(nodeA.getPeerCount()).toBe(1);

    await nodeC.start();
    expect(nodeA.getPeerCount()).toBe(2);
    expect(nodeB.getPeerCount()).toBe(2);

    await nodeC.stop();
    expect(nodeA.getPeerCount()).toBe(1);

    await nodeA.stop();
    await nodeB.stop();
  });

  it('defaults to in-memory when no platform is specified', async () => {
    const node = createPulseMeshNode({});
    await node.start();
    expect(node.getPeerId()).toBeTruthy();
    await node.stop();
  });
});
