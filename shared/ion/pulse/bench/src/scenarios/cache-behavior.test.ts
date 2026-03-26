import { describe, it, expect, afterEach } from 'vitest';
import { createPulseRelay } from '../pulse-relay.js';
import type { PulseRelayInstance } from '../pulse-relay.js';

describe('Cache Behavior', () => {
  const relays: PulseRelayInstance[] = [];

  afterEach(() => {
    relays.forEach((r) => r.destroy());
    relays.length = 0;
  });

  it('handles cache miss, hit, and invalidation cycle', async () => {
    const relay0 = createPulseRelay({ peerId: 'relay-0' });
    const relay1 = createPulseRelay({ peerId: 'relay-1' });
    relays.push(relay0, relay1);

    const testSoul = 'test/cache/item-1';
    await relay0.putData(testSoul, { value: 'cached-data' });

    expect(relay1.cache.get(testSoul)).toBeUndefined();
    expect(relay1.cache.getStats().misses).toBe(1);

    const encoded = relay0.sync.encodePulseState();
    relay1.cache.set(testSoul, encoded);

    const cached = relay1.cache.get(testSoul);
    expect(cached).toBeDefined();
    expect(relay1.cache.getStats().hits).toBe(1);

    relay1.cache.invalidate(testSoul);

    expect(relay1.cache.get(testSoul)).toBeUndefined();
    expect(relay1.cache.getStats().misses).toBe(2);
  });
});
