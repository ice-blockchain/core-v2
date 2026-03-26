import { describe, it, expect } from 'vitest';

import { createPulseShardRing } from './pulse-shard';

describe('createPulseShardRing', () => {
  it('adds relays and tracks relay count', () => {
    const ring = createPulseShardRing();
    ring.addRelay('relay-a');
    ring.addRelay('relay-b');
    ring.addRelay('relay-c');

    expect(ring.getRelayCount()).toBe(3);
  });

  it('distributes virtual nodes across ring when relays are added', () => {
    const ring = createPulseShardRing({ virtualNodes: 100 });
    ring.addRelay('relay-a');
    ring.addRelay('relay-b');

    expect(ring.getRelayCount()).toBe(2);
  });

  it('returns correct number of shard owners based on minReplicas', () => {
    const ring = createPulseShardRing({ minReplicas: 2 });
    ring.addRelay('relay-a');
    ring.addRelay('relay-b');
    ring.addRelay('relay-c');

    const owners = ring.getShardOwners('test-soul-123');

    expect(owners).toHaveLength(2);
    expect(new Set(owners).size).toBe(2);
  });

  it('returns fewer owners when relay count is less than minReplicas', () => {
    const ring = createPulseShardRing({ minReplicas: 5 });
    ring.addRelay('relay-a');
    ring.addRelay('relay-b');

    const owners = ring.getShardOwners('test-soul-456');

    expect(owners).toHaveLength(2);
  });

  it('returns empty array when no relays exist', () => {
    const ring = createPulseShardRing();
    const owners = ring.getShardOwners('orphan-soul');

    expect(owners).toEqual([]);
  });

  it('removes relay and redistributes ownership', () => {
    const ring = createPulseShardRing({ minReplicas: 2 });
    ring.addRelay('relay-a');
    ring.addRelay('relay-b');
    ring.addRelay('relay-c');

    ring.removeRelay('relay-b');

    expect(ring.getRelayCount()).toBe(2);
    const owners = ring.getShardOwners('test-soul-789');
    expect(owners).toHaveLength(2);
    expect(owners).not.toContain('relay-b');
  });

  it('reports isLocalShard true for owners and false otherwise', () => {
    const ring = createPulseShardRing({ minReplicas: 1 });
    ring.addRelay('relay-a');
    ring.addRelay('relay-b');
    ring.addRelay('relay-c');

    const soul = 'test-soul-local';
    const owners = ring.getShardOwners(soul);

    expect(ring.isLocalShard(soul, owners[0])).toBe(true);

    const nonOwners = ['relay-a', 'relay-b', 'relay-c']
      .filter((id) => !owners.includes(id));

    for (const nonOwner of nonOwners) {
      expect(ring.isLocalShard(soul, nonOwner)).toBe(false);
    }
  });

  it('distributes souls roughly evenly across relays', () => {
    const ring = createPulseShardRing({
      virtualNodes: 150,
      minReplicas: 1,
    });
    const relayIds = ['relay-a', 'relay-b', 'relay-c', 'relay-d'];

    for (const relayId of relayIds) {
      ring.addRelay(relayId);
    }

    const counts: Record<string, number> = {};
    for (const id of relayIds) {
      counts[id] = 0;
    }

    const soulCount = 1000;
    for (let i = 0; i < soulCount; i++) {
      const owners = ring.getShardOwners(`soul-${i}`);
      if (owners.length > 0) {
        counts[owners[0]]++;
      }
    }

    const expectedPerRelay = soulCount / relayIds.length;
    const tolerance = expectedPerRelay * 0.3;

    for (const relayId of relayIds) {
      expect(counts[relayId]).toBeGreaterThan(expectedPerRelay - tolerance);
      expect(counts[relayId]).toBeLessThan(expectedPerRelay + tolerance);
    }
  });

  it('does not add duplicate relays', () => {
    const ring = createPulseShardRing();
    ring.addRelay('relay-a');
    ring.addRelay('relay-a');

    expect(ring.getRelayCount()).toBe(1);
  });

  it('ignores removal of non-existent relay', () => {
    const ring = createPulseShardRing();
    ring.addRelay('relay-a');
    ring.removeRelay('relay-nonexistent');

    expect(ring.getRelayCount()).toBe(1);
  });
});
