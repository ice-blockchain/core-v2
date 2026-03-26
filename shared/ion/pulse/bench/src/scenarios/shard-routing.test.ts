import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseShardRing } from '../../../shard/src/index';

describe('shard-routing', () => {
  let ring: ReturnType<typeof createPulseShardRing>;

  beforeEach(() => {
    ring = createPulseShardRing({ virtualNodes: 150, minReplicas: 3 });
  });

  it('returns empty owners when no relays exist', () => {
    const owners = ring.getShardOwners('users/alice');
    expect(owners).toHaveLength(0);
  });

  it('routes data to the correct shard owner with 3 relays', () => {
    ring.addRelay('relay-alpha');
    ring.addRelay('relay-beta');
    ring.addRelay('relay-gamma');

    const owners = ring.getShardOwners('users/alice');

    expect(owners.length).toBeGreaterThanOrEqual(1);
    expect(owners.length).toBeLessThanOrEqual(3);
  });

  it('returns consistent results for the same soul', () => {
    ring.addRelay('relay-alpha');
    ring.addRelay('relay-beta');
    ring.addRelay('relay-gamma');

    const firstResult = ring.getShardOwners('posts/42');
    const secondResult = ring.getShardOwners('posts/42');

    expect(firstResult).toEqual(secondResult);
  });

  it('returns all 3 relays as owners when minReplicas is 3', () => {
    ring.addRelay('relay-alpha');
    ring.addRelay('relay-beta');
    ring.addRelay('relay-gamma');

    const owners = ring.getShardOwners('messages/100');
    expect(owners).toHaveLength(3);
  });

  it('correctly identifies local shard ownership', () => {
    ring.addRelay('relay-alpha');
    ring.addRelay('relay-beta');
    ring.addRelay('relay-gamma');

    const soul = 'users/alice';
    const owners = ring.getShardOwners(soul);

    for (const owner of owners) {
      expect(ring.isLocalShard(soul, owner)).toBe(true);
    }
  });

  it('identifies non-owner relays correctly', () => {
    const smallRing = createPulseShardRing({ virtualNodes: 150, minReplicas: 1 });
    smallRing.addRelay('relay-alpha');
    smallRing.addRelay('relay-beta');
    smallRing.addRelay('relay-gamma');

    const soul = 'users/test';
    const owners = smallRing.getShardOwners(soul);
    const nonOwners = ['relay-alpha', 'relay-beta', 'relay-gamma']
      .filter((relayId) => !owners.includes(relayId));

    for (const nonOwner of nonOwners) {
      expect(smallRing.isLocalShard(soul, nonOwner)).toBe(false);
    }
  });

  it('distributes souls across relays with reasonable evenness', () => {
    ring.addRelay('relay-alpha');
    ring.addRelay('relay-beta');
    ring.addRelay('relay-gamma');

    const primaryOwnerCounts = new Map<string, number>();

    for (let i = 0; i < 300; i++) {
      const soul = `soul-${i}`;
      const owners = ring.getShardOwners(soul);
      const primary = owners[0];
      primaryOwnerCounts.set(primary, (primaryOwnerCounts.get(primary) ?? 0) + 1);
    }

    expect(primaryOwnerCounts.size).toBe(3);

    for (const [, count] of primaryOwnerCounts) {
      expect(count).toBeGreaterThan(30);
      expect(count).toBeLessThan(200);
    }
  });

  it('does not duplicate relay IDs when adding the same relay twice', () => {
    ring.addRelay('relay-alpha');
    ring.addRelay('relay-alpha');

    expect(ring.getRelayCount()).toBe(1);
  });

  it('limits owners to available relay count', () => {
    ring.addRelay('relay-alpha');

    const owners = ring.getShardOwners('users/bob');

    expect(owners).toHaveLength(1);
    expect(owners[0]).toBe('relay-alpha');
  });
});
