import { describe, it, expect, afterEach } from 'vitest';
import { createPulseRelay } from '../pulse-relay.js';
import { createPulseClient } from '../client-worker.js';
import { generatePulseEvents } from '../data-generator.js';
import { createPulseGraph } from '../../../graph/src/index.js';
import { createPulseSync } from '../../../sync/src/index.js';
import type { PulseRelayInstance } from '../pulse-relay.js';

describe('Offline Reconciliation', () => {
  const relays: PulseRelayInstance[] = [];

  afterEach(() => {
    relays.forEach((r) => r.destroy());
    relays.length = 0;
  });

  it('reconciles events after offline client reconnects', async () => {
    const relay0 = createPulseRelay({ peerId: 'relay-0' });
    const relay1 = createPulseRelay({ peerId: 'relay-1' });
    relays.push(relay0, relay1);
    relay0.addPeer('relay-1');
    relay1.addPeer('relay-0');

    const client0 = createPulseClient({ userId: 'user-0', relayEndpoint: relay0 });
    const client1 = createPulseClient({ userId: 'user-1', relayEndpoint: relay1 });

    const onlineEvents = generatePulseEvents({ userId: 'user-0', eventCount: 5 });
    await client0.writeEvents(onlineEvents);

    client1.disconnect();

    const localGraph = createPulseGraph();
    const localSync = createPulseSync(localGraph.getDocument());
    const offlineEvents = generatePulseEvents({ userId: 'user-1', eventCount: 5 });
    for (const event of offlineEvents) {
      localGraph.pulsePut(event.soul, event.data);
    }

    client1.reconnect(relay1);
    const localState = localSync.encodePulseState();
    relay1.sync.applyPulseUpdate(localState);
    localSync.destroy();

    await relay0.syncWith(relay1);

    for (const event of onlineEvents) {
      expect(await relay1.getData(event.soul)).not.toBeNull();
    }
    for (const event of offlineEvents) {
      expect(await relay0.getData(event.soul)).not.toBeNull();
    }
  });
});
