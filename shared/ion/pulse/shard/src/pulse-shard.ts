import { sha256 } from '@noble/hashes/sha256';

import type { PulseShardConfig, PulseShardRing } from './types';

const DEFAULT_VIRTUAL_NODES = 150;
const DEFAULT_MIN_REPLICAS = 3;

interface RingEntry {
  readonly position: number;
  readonly relayId: string;
}

function computeHashPosition(input: string): number {
  const hash = sha256(new TextEncoder().encode(input));
  const view = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
  return view.getUint32(0, false);
}

function buildVirtualNodeKey(relayId: string, index: number): string {
  return `${relayId}:vnode:${index}`;
}

function insertSorted(ring: RingEntry[], entry: RingEntry): void {
  let low = 0;
  let high = ring.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ring[mid].position < entry.position) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  ring.splice(low, 0, entry);
}

function findStartIndex(ring: readonly RingEntry[], position: number): number {
  let low = 0;
  let high = ring.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ring[mid].position < position) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low % ring.length;
}

function collectUniqueOwners(options: {
  ring: readonly RingEntry[];
  startIndex: number;
  replicaCount: number;
  relayCount: number;
}): string[] {
  const { ring, startIndex, replicaCount, relayCount } = options;
  const owners: string[] = [];
  const seen = new Set<string>();
  const maxToCheck = Math.min(replicaCount, relayCount);

  for (let i = 0; i < ring.length && owners.length < maxToCheck; i++) {
    const index = (startIndex + i) % ring.length;
    const { relayId } = ring[index];

    if (!seen.has(relayId)) {
      seen.add(relayId);
      owners.push(relayId);
    }
  }

  return owners;
}

export function createPulseShardRing(config?: PulseShardConfig): PulseShardRing {
  const virtualNodes = config?.virtualNodes ?? DEFAULT_VIRTUAL_NODES;
  const minReplicas = config?.minReplicas ?? DEFAULT_MIN_REPLICAS;
  const ring: RingEntry[] = [];
  const relaySet = new Set<string>();

  function addRelay(relayId: string): void {
    if (relaySet.has(relayId)) return;
    relaySet.add(relayId);

    for (let i = 0; i < virtualNodes; i++) {
      const key = buildVirtualNodeKey(relayId, i);
      const position = computeHashPosition(key);
      insertSorted(ring, { position, relayId });
    }
  }

  function removeRelay(relayId: string): void {
    if (!relaySet.has(relayId)) return;
    relaySet.delete(relayId);

    let writeIndex = 0;
    for (let readIndex = 0; readIndex < ring.length; readIndex++) {
      if (ring[readIndex].relayId !== relayId) {
        ring[writeIndex] = ring[readIndex];
        writeIndex++;
      }
    }
    ring.length = writeIndex;
  }

  function getShardOwners(soul: string): string[] {
    if (ring.length === 0) return [];
    const position = computeHashPosition(soul);
    const startIndex = findStartIndex(ring, position);
    return collectUniqueOwners({
      ring,
      startIndex,
      replicaCount: minReplicas,
      relayCount: relaySet.size,
    });
  }

  function isLocalShard(soul: string, localRelayId: string): boolean {
    const owners = getShardOwners(soul);
    return owners.includes(localRelayId);
  }

  function getRelayCount(): number {
    return relaySet.size;
  }

  return {
    addRelay,
    removeRelay,
    getShardOwners,
    isLocalShard,
    getRelayCount,
  };
}
