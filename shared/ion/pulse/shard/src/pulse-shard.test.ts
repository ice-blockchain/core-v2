import { describe, it, expect } from 'vitest';
import { createPulseShard } from './pulse-shard';

describe('createPulseShard', () => {
  it('increases ring size by virtualNodesPerPeer on addPeer', () => {
    const shard = createPulseShard({ virtualNodesPerPeer: 100 });
    shard.addPeer('peer-1');

    expect(shard.getRingSize()).toBe(100);

    shard.addPeer('peer-2');
    expect(shard.getRingSize()).toBe(200);
    shard.destroy();
  });

  it('decreases ring size on removePeer', () => {
    const shard = createPulseShard({ virtualNodesPerPeer: 50 });
    shard.addPeer('peer-1');
    shard.addPeer('peer-2');
    expect(shard.getRingSize()).toBe(100);

    shard.removePeer('peer-1');
    expect(shard.getRingSize()).toBe(50);
    shard.destroy();
  });

  it('returns minReplicas distinct peers from getShardOwners', () => {
    const shard = createPulseShard({ minReplicas: 3, virtualNodesPerPeer: 50 });
    shard.addPeer('peer-a');
    shard.addPeer('peer-b');
    shard.addPeer('peer-c');
    shard.addPeer('peer-d');

    const owners = shard.getShardOwners('some-soul');
    expect(owners).toHaveLength(3);

    const unique = new Set(owners);
    expect(unique.size).toBe(3);
    shard.destroy();
  });

  it('returns deterministic shard owners for the same soul', () => {
    const shard = createPulseShard({ virtualNodesPerPeer: 50 });
    shard.addPeer('peer-a');
    shard.addPeer('peer-b');
    shard.addPeer('peer-c');

    const first = shard.getShardOwners('deterministic-soul');
    const second = shard.getShardOwners('deterministic-soul');

    expect(first).toEqual(second);
    shard.destroy();
  });

  it('identifies local shard ownership correctly', () => {
    const shard = createPulseShard({ minReplicas: 2, virtualNodesPerPeer: 50 });
    shard.addPeer('peer-x');
    shard.addPeer('peer-y');
    shard.addPeer('peer-z');

    const owners = shard.getShardOwners('test-soul');
    expect(shard.isLocalShard('test-soul', owners[0]!)).toBe(true);

    const nonOwners = ['peer-x', 'peer-y', 'peer-z'].filter(
      (p) => !owners.includes(p),
    );
    if (nonOwners[0]) {
      expect(shard.isLocalShard('test-soul', nonOwners[0])).toBe(false);
    }
    shard.destroy();
  });

  it('distributes souls reasonably across peers', () => {
    const shard = createPulseShard({ virtualNodesPerPeer: 150 });
    const peers = ['peer-a', 'peer-b', 'peer-c', 'peer-d', 'peer-e'];
    for (const peer of peers) {
      shard.addPeer(peer);
    }

    const counts = new Map<string, number>();
    for (const peer of peers) {
      counts.set(peer, 0);
    }

    const totalSouls = 1000;
    for (let i = 0; i < totalSouls; i++) {
      const owners = shard.getShardOwners(`soul-${i}`);
      const primary = owners[0]!;
      counts.set(primary, (counts.get(primary) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      const percentage = count / totalSouls;
      expect(percentage).toBeGreaterThan(0.1);
      expect(percentage).toBeLessThan(0.3);
    }
    shard.destroy();
  });

  it('tracks peer health state', () => {
    const shard = createPulseShard();
    shard.addPeer('peer-1');
    shard.addPeer('peer-2');

    expect(shard.getHealthyPeers()).toEqual(['peer-1', 'peer-2']);

    shard.markPeerDegraded('peer-1');
    expect(shard.getHealthyPeers()).toEqual(['peer-2']);

    shard.markPeerHealthy('peer-1');
    expect(shard.getHealthyPeers()).toEqual(['peer-1', 'peer-2']);
    shard.destroy();
  });

  it('tracks peer load', () => {
    const shard = createPulseShard();
    shard.addPeer('peer-1');

    expect(shard.getPeerLoad('peer-1')).toBe(0);

    shard.updatePeerLoad('peer-1', 42);
    expect(shard.getPeerLoad('peer-1')).toBe(42);
    shard.destroy();
  });
});
