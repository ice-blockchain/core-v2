import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInMemoryMeshNode, clearMeshRegistry } from '../../../mesh/src/index';
import type { PulseMeshNode, PulseMeshMessage } from '../../../mesh/src/index';

const TOPIC = 'sync-events';

function encodeMessage(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function decodeMessage(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

describe('network-chaos', () => {
  let nodeAlpha: PulseMeshNode;
  let nodeBeta: PulseMeshNode;
  let nodeGamma: PulseMeshNode;

  beforeEach(async () => {
    clearMeshRegistry();
    nodeAlpha = createInMemoryMeshNode({});
    nodeBeta = createInMemoryMeshNode({});
    nodeGamma = createInMemoryMeshNode({});
    await nodeAlpha.start();
    await nodeBeta.start();
    await nodeGamma.start();
  });

  afterEach(async () => {
    await nodeAlpha.stop();
    await nodeBeta.stop();
    await nodeGamma.stop();
    clearMeshRegistry();
  });

  it('delivers messages to all subscribed nodes', async () => {
    const receivedBeta: string[] = [];
    const receivedGamma: string[] = [];

    nodeBeta.subscribe(TOPIC, (message: PulseMeshMessage) => {
      receivedBeta.push(decodeMessage(message.data));
    });
    nodeGamma.subscribe(TOPIC, (message: PulseMeshMessage) => {
      receivedGamma.push(decodeMessage(message.data));
    });

    await nodeAlpha.publish(TOPIC, encodeMessage('hello-all'));

    expect(receivedBeta).toContain('hello-all');
    expect(receivedGamma).toContain('hello-all');
  });

  it('does not deliver messages back to the sender', async () => {
    const selfReceived: string[] = [];
    nodeAlpha.subscribe(TOPIC, (message: PulseMeshMessage) => {
      selfReceived.push(decodeMessage(message.data));
    });

    await nodeAlpha.publish(TOPIC, encodeMessage('echo-test'));

    expect(selfReceived).toHaveLength(0);
  });

  it('surviving nodes still receive messages after one node crashes', async () => {
    const receivedBeta: string[] = [];
    nodeBeta.subscribe(TOPIC, (message: PulseMeshMessage) => {
      receivedBeta.push(decodeMessage(message.data));
    });

    nodeGamma.subscribe(TOPIC, () => {});

    await nodeGamma.stop();

    await nodeAlpha.publish(TOPIC, encodeMessage('after-crash'));

    expect(receivedBeta).toContain('after-crash');
  });

  it('stopped node does not receive messages', async () => {
    const receivedGamma: string[] = [];
    nodeGamma.subscribe(TOPIC, (message: PulseMeshMessage) => {
      receivedGamma.push(decodeMessage(message.data));
    });

    await nodeGamma.stop();

    await nodeAlpha.publish(TOPIC, encodeMessage('missed-message'));

    expect(receivedGamma).toHaveLength(0);
  });

  it('restarted node can rejoin and receive new messages', async () => {
    await nodeGamma.stop();

    const restartedNode = createInMemoryMeshNode({});
    await restartedNode.start();

    const receivedRestarted: string[] = [];
    restartedNode.subscribe(TOPIC, (message: PulseMeshMessage) => {
      receivedRestarted.push(decodeMessage(message.data));
    });

    await nodeAlpha.publish(TOPIC, encodeMessage('post-restart'));

    expect(receivedRestarted).toContain('post-restart');

    await restartedNode.stop();
  });

  it('peer count decreases when a node stops', async () => {
    expect(nodeAlpha.getPeerCount()).toBe(2);

    await nodeGamma.stop();

    expect(nodeAlpha.getPeerCount()).toBe(1);
  });

  it('peer count increases when a new node starts', async () => {
    const nodeDelta = createInMemoryMeshNode({});
    await nodeDelta.start();

    expect(nodeAlpha.getPeerCount()).toBe(3);

    await nodeDelta.stop();
  });

  it('handles rapid publish after node removal without errors', async () => {
    await nodeBeta.stop();

    const publishPromises = [];
    for (let i = 0; i < 10; i++) {
      publishPromises.push(nodeAlpha.publish(TOPIC, encodeMessage(`msg-${i}`)));
    }

    await expect(Promise.all(publishPromises)).resolves.not.toThrow();
  });

  it('unsubscribed node stops receiving messages on that topic', async () => {
    const received: string[] = [];
    const unsubscribe = nodeBeta.subscribe(TOPIC, (message: PulseMeshMessage) => {
      received.push(decodeMessage(message.data));
    });

    await nodeAlpha.publish(TOPIC, encodeMessage('before-unsub'));
    expect(received).toHaveLength(1);

    unsubscribe();

    await nodeAlpha.publish(TOPIC, encodeMessage('after-unsub'));
    expect(received).toHaveLength(1);
  });
});
