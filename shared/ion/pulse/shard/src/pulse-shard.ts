import { sha256 } from '@noble/hashes/sha256';
import type { PulseShard, PulseShardConfig, ShardNode } from './types';

interface RingEntry {
  hash: number;
  peerId: string;
}

const DEFAULT_CONFIG: Required<PulseShardConfig> = {
  minReplicas: 3,
  maxReplicas: 5,
  virtualNodesPerPeer: 150,
  repairThresholdMs: 60_000,
};

function hashToPosition(input: string): number {
  const digest = sha256(input);
  return (
    ((digest[0]! << 24) | (digest[1]! << 16) | (digest[2]! << 8) | digest[3]!) >>> 0
  );
}

function findRingPosition(ring: RingEntry[], hash: number): number {
  let low = 0;
  let high = ring.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ring[mid]!.hash < hash) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low % ring.length;
}

function collectDistinctPeers(options: {
  ring: RingEntry[];
  startIndex: number;
  count: number;
}): string[] {
  const { ring, startIndex, count } = options;
  const owners: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < ring.length; i++) {
    const index = (startIndex + i) % ring.length;
    const entry = ring[index];
    if (!entry) continue;

    if (!seen.has(entry.peerId)) {
      seen.add(entry.peerId);
      owners.push(entry.peerId);
      if (owners.length >= count) break;
    }
  }

  return owners;
}

export function createPulseShard(overrides?: PulseShardConfig): PulseShard {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const nodes = new Map<string, ShardNode>();
  let ring: RingEntry[] = [];

  function addPeer(peerId: string): void {
    if (nodes.has(peerId)) return;

    nodes.set(peerId, {
      peerId,
      load: 0,
      isHealthy: true,
      lastSeen: Date.now(),
    });

    for (let i = 0; i < config.virtualNodesPerPeer; i++) {
      ring.push({ hash: hashToPosition(`${peerId}:${i}`), peerId });
    }
    ring.sort((a, b) => a.hash - b.hash);
  }

  function removePeer(peerId: string): void {
    if (!nodes.has(peerId)) return;
    nodes.delete(peerId);
    ring = ring.filter((entry) => entry.peerId !== peerId);
  }

  function getShardOwners(soul: string): string[] {
    if (ring.length === 0) return [];
    const position = hashToPosition(soul);
    const startIndex = findRingPosition(ring, position);
    const owners = collectDistinctPeers({ ring, startIndex, count: config.minReplicas });
    return owners.slice(0, config.maxReplicas);
  }

  function isLocalShard(soul: string, localPeerId: string): boolean {
    return getShardOwners(soul).includes(localPeerId);
  }

  function getPeerLoad(peerId: string): number {
    return nodes.get(peerId)?.load ?? 0;
  }

  function updatePeerLoad(peerId: string, load: number): void {
    const node = nodes.get(peerId);
    if (!node) return;
    node.load = load;
  }

  function markPeerHealthy(peerId: string): void {
    const node = nodes.get(peerId);
    if (!node) return;
    node.isHealthy = true;
    node.lastSeen = Date.now();
  }

  function markPeerDegraded(peerId: string): void {
    const node = nodes.get(peerId);
    if (!node) return;
    node.isHealthy = false;
  }

  function isPeerStale(peerId: string): boolean {
    const node = nodes.get(peerId);
    if (!node) return true;
    return Date.now() - node.lastSeen > config.repairThresholdMs;
  }

  function getHealthyPeers(): string[] {
    return [...nodes.values()].filter((n) => n.isHealthy).map((n) => n.peerId);
  }

  function getAllPeers(): ShardNode[] {
    return [...nodes.values()];
  }

  function getRingSize(): number {
    return ring.length;
  }

  function destroy(): void {
    nodes.clear();
    ring.length = 0;
  }

  return {
    addPeer,
    removePeer,
    getShardOwners,
    isLocalShard,
    getPeerLoad,
    updatePeerLoad,
    markPeerHealthy,
    markPeerDegraded,
    isPeerStale,
    getHealthyPeers,
    getAllPeers,
    getRingSize,
    destroy,
  };
}
