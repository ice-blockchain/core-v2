import { describe, it, expect, afterEach } from 'vitest';
import { createPulseRelay } from '../pulse-relay.js';
import { createPulseClient } from '../client-worker.js';
import { generatePulseEvents } from '../data-generator.js';
import type { PulseRelayInstance } from '../pulse-relay.js';

describe('CRDT Convergence', () => {
  const relays: PulseRelayInstance[] = [];

  afterEach(() => {
    relays.forEach((r) => r.destroy());
    relays.length = 0;
  });

  it('converges data across 3 relays after concurrent writes', async () => {
    for (let i = 0; i < 3; i++) {
      relays.push(createPulseRelay({ peerId: `relay-${i}` }));
    }
    for (const relay of relays) {
      for (const other of relays) {
        if (relay.peerId !== other.peerId) relay.addPeer(other.peerId);
      }
    }

    const clients = relays.map((relay, i) =>
      createPulseClient({ userId: `user-${i}`, relayEndpoint: relay })
    );

    await Promise.all(clients.map((client) => {
      const events = generatePulseEvents({ userId: client.userId, eventCount: 10 });
      return client.writeEvents(events);
    }));

    await relays[0]!.syncWith(relays[1]!);
    await relays[0]!.syncWith(relays[2]!);
    await relays[1]!.syncWith(relays[2]!);

    const counts = relays.map((r) => r.graph.pulseQuery('').length);
    expect(counts[0]).toBe(counts[1]);
    expect(counts[1]).toBe(counts[2]);
    expect(counts[0]!).toBeGreaterThan(0);
  });
});
