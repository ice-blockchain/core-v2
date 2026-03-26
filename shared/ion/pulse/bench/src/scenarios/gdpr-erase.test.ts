import { describe, it, expect, afterEach } from 'vitest';
import { createPulseRelay } from '../pulse-relay.js';
import type { PulseRelayInstance } from '../pulse-relay.js';

describe('GDPR Erase', () => {
  const relays: PulseRelayInstance[] = [];

  afterEach(() => {
    relays.forEach((r) => r.destroy());
    relays.length = 0;
  });

  it('erases data across synced relays', async () => {
    const relay0 = createPulseRelay({ peerId: 'relay-0' });
    const relay1 = createPulseRelay({ peerId: 'relay-1' });
    relays.push(relay0, relay1);
    relay0.addPeer('relay-1');
    relay1.addPeer('relay-0');

    const testSoul = 'test/gdpr/user-data-1';
    await relay0.putData(testSoul, { name: 'Sensitive Data', email: 'user@example.com' });

    await relay0.syncWith(relay1);
    expect(await relay1.getData(testSoul)).not.toBeNull();

    relay0.graph.pulseErase(testSoul);

    await relay0.syncWith(relay1);

    expect(await relay0.getData(testSoul)).toBeNull();
    expect(await relay1.getData(testSoul)).toBeNull();
  });
});
