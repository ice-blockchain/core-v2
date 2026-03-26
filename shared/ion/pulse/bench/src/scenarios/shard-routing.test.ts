import { describe, it, expect, afterEach } from 'vitest';
import { createPulseRelay } from '../pulse-relay.js';
import type { PulseRelayInstance } from '../pulse-relay.js';

describe('Shard Routing', () => {
  const relays: PulseRelayInstance[] = [];

  afterEach(() => {
    relays.forEach((r) => r.destroy());
    relays.length = 0;
  });

  it('routes data through shard ring and syncs to peers', async () => {
    for (let i = 0; i < 3; i++) {
      relays.push(createPulseRelay({ peerId: `relay-${i}` }));
    }
    for (const relay of relays) {
      for (const other of relays) {
        if (relay.peerId !== other.peerId) relay.addPeer(other.peerId);
      }
    }

    const testSoul = 'test/shard-routing/item-1';
    await relays[0]!.putData(testSoul, { value: 'routed-data' });

    const hasOwner = relays.some((r) => r.shard.isLocalShard(testSoul, r.peerId));
    expect(hasOwner).toBe(true);

    await relays[0]!.syncWith(relays[1]!);
    await relays[0]!.syncWith(relays[2]!);

    expect(await relays[1]!.getData(testSoul)).not.toBeNull();
    expect(await relays[2]!.getData(testSoul)).not.toBeNull();
  });
});
