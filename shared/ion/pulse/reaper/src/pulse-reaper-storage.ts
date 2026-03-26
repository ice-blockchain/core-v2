import type { PulseTombstone, ReaperStorage } from './types.js';

export function createReaperStorage(): ReaperStorage {
  const tombstones = new Map<string, PulseTombstone>();

  function getExpiredNodes(now: number): PulseTombstone[] {
    return filterExpiredTombstones(tombstones, now);
  }

  function getExpiredTombstones(now: number): PulseTombstone[] {
    return filterExpiredTombstones(tombstones, now);
  }

  function removeTombstone(soul: string): boolean {
    return tombstones.delete(soul);
  }

  function addTombstone(tombstone: PulseTombstone): void {
    tombstones.set(tombstone.soul, tombstone);
  }

  function getTombstone(soul: string): PulseTombstone | undefined {
    return tombstones.get(soul);
  }

  function getAllTombstones(): PulseTombstone[] {
    return Array.from(tombstones.values());
  }

  return {
    getExpiredNodes,
    getExpiredTombstones,
    removeTombstone,
    addTombstone,
    getTombstone,
    getAllTombstones,
  };
}

function filterExpiredTombstones(
  tombstones: Map<string, PulseTombstone>,
  now: number,
): PulseTombstone[] {
  const expired: PulseTombstone[] = [];
  for (const tombstone of tombstones.values()) {
    if (tombstone.expiresAt <= now) {
      expired.push(tombstone);
    }
  }
  return expired;
}
