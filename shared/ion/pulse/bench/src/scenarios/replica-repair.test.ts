import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseShardRing } from '../../../shard/src/index';
import type { PulseShardRing } from '../../../shard/src/index';

const RELAY_IDS = ['relay-alpha', 'relay-beta', 'relay-gamma'];
const TEST_SOULS = Array.from({ length: 50 }, (_, index) => `soul-${index}`);

describe('replica-repair', () => {
  let ring: PulseShardRing;

  beforeEach(() => {
    ring = createPulseShardRing({ virtualNodes: 150, minReplicas: 2 });
    for (const relayId of RELAY_IDS) {
      ring.addRelay(relayId);
    }
  });

  it('assigns exactly 2 owners per soul with replicationFactor=2', () => {
    for (const soul of TEST_SOULS) {
      const owners = ring.getShardOwners(soul);
      expect(owners).toHaveLength(2);
    }
  });

  it('assigns distinct relay IDs as owners for each soul', () => {
    for (const soul of TEST_SOULS) {
      const owners = ring.getShardOwners(soul);
      const uniqueOwners = new Set(owners);
      expect(uniqueOwners.size).toBe(owners.length);
    }
  });

  it('covers all shards after removing one node', () => {
    ring.removeRelay('relay-beta');

    for (const soul of TEST_SOULS) {
      const owners = ring.getShardOwners(soul);
      expect(owners.length).toBeGreaterThanOrEqual(1);
      expect(owners.length).toBeLessThanOrEqual(2);
    }
  });

  it('assigns remaining relays as owners after node removal', () => {
    ring.removeRelay('relay-beta');

    for (const soul of TEST_SOULS) {
      const owners = ring.getShardOwners(soul);
      for (const owner of owners) {
        expect(owner).not.toBe('relay-beta');
      }
    }
  });

  it('restores full replication after re-adding removed node', () => {
    ring.removeRelay('relay-gamma');
    ring.addRelay('relay-gamma');

    for (const soul of TEST_SOULS) {
      const owners = ring.getShardOwners(soul);
      expect(owners).toHaveLength(2);
    }
  });

  it('produces consistent routing after remove and re-add cycle', () => {
    const ownersBefore = TEST_SOULS.map((soul) => ring.getShardOwners(soul));

    ring.removeRelay('relay-alpha');
    ring.addRelay('relay-alpha');

    const ownersAfter = TEST_SOULS.map((soul) => ring.getShardOwners(soul));

    expect(ownersAfter).toEqual(ownersBefore);
  });

  it('reduces relay count after removal and restores after re-add', () => {
    expect(ring.getRelayCount()).toBe(3);

    ring.removeRelay('relay-beta');
    expect(ring.getRelayCount()).toBe(2);

    ring.addRelay('relay-beta');
    expect(ring.getRelayCount()).toBe(3);
  });

  it('handles removing all relays gracefully', () => {
    for (const relayId of RELAY_IDS) {
      ring.removeRelay(relayId);
    }

    expect(ring.getRelayCount()).toBe(0);
    expect(ring.getShardOwners('any-soul')).toHaveLength(0);
  });

  it('distributes ownership across all relays', () => {
    const ownershipCounts = new Map<string, number>();
    for (const relayId of RELAY_IDS) {
      ownershipCounts.set(relayId, 0);
    }

    for (const soul of TEST_SOULS) {
      const owners = ring.getShardOwners(soul);
      for (const owner of owners) {
        ownershipCounts.set(owner, (ownershipCounts.get(owner) ?? 0) + 1);
      }
    }

    for (const [, count] of ownershipCounts) {
      expect(count).toBeGreaterThan(0);
    }
  });
});
