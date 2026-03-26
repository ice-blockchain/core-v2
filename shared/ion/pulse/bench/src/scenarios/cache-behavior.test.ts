import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseCache } from '../../../cache/src/index';
import type { PulseCacheInstance } from '../../../cache/src/index';

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

describe('cache-behavior', () => {
  let cache: PulseCacheInstance;

  beforeEach(() => {
    cache = createPulseCache({ defaultTtlMs: 5000 });
  });

  it('returns cached data on cache hit', () => {
    const data = { name: 'Alice', score: 100 };
    cache.set('users/alice', data);

    const result = cache.get('users/alice');

    expect(result).toEqual(data);
  });

  it('returns undefined on cache miss', () => {
    const result = cache.get('nonexistent/soul');
    expect(result).toBeUndefined();
  });

  it('expires entries after TTL elapses', async () => {
    const shortTtlCache = createPulseCache({ defaultTtlMs: 50 });
    shortTtlCache.set('temp/data', { value: 'ephemeral' });

    expect(shortTtlCache.get('temp/data')).toBeDefined();

    await delay(100);

    expect(shortTtlCache.get('temp/data')).toBeUndefined();
  });

  it('keeps entries alive before TTL expires', async () => {
    const timedCache = createPulseCache({ defaultTtlMs: 300 });
    timedCache.set('persistent/data', { value: 'durable' });

    await delay(50);

    expect(timedCache.get('persistent/data')).toBeDefined();
  });

  it('evicts least-recently-used entries when cache is full', () => {
    const tinyCache = createPulseCache({ maxSizeBytes: 100, defaultTtlMs: 60000 });

    tinyCache.set('first', 'a'.repeat(40));
    tinyCache.set('second', 'b'.repeat(40));
    tinyCache.set('third', 'c'.repeat(40));

    const stats = tinyCache.getStats();
    expect(stats.size).toBeLessThanOrEqual(2);
  });

  it('invalidates a specific entry and returns true', () => {
    cache.set('users/bob', { name: 'Bob' });

    const removed = cache.invalidate('users/bob');

    expect(removed).toBe(true);
    expect(cache.get('users/bob')).toBeUndefined();
  });

  it('returns false when invalidating non-existent entry', () => {
    const removed = cache.invalidate('never/existed');
    expect(removed).toBe(false);
  });

  it('tracks hits accurately in stats', () => {
    cache.set('soul-a', 'value-a');
    cache.set('soul-b', 'value-b');

    cache.get('soul-a');
    cache.get('soul-a');
    cache.get('soul-b');

    const stats = cache.getStats();
    expect(stats.hits).toBe(3);
  });

  it('tracks misses accurately in stats', () => {
    cache.get('missing-1');
    cache.get('missing-2');
    cache.get('missing-3');

    const stats = cache.getStats();
    expect(stats.misses).toBe(3);
  });

  it('tracks eviction count in stats', () => {
    const tinyCache = createPulseCache({ maxSizeBytes: 80, defaultTtlMs: 60000 });

    tinyCache.set('entry-1', 'x'.repeat(30));
    tinyCache.set('entry-2', 'y'.repeat(30));
    tinyCache.set('entry-3', 'z'.repeat(30));

    const stats = tinyCache.getStats();
    expect(stats.evictions).toBeGreaterThanOrEqual(1);
  });

  it('reports correct size after insertions and invalidations', () => {
    cache.set('item-1', 'value-1');
    cache.set('item-2', 'value-2');
    cache.set('item-3', 'value-3');

    expect(cache.getStats().size).toBe(3);

    cache.invalidate('item-2');

    expect(cache.getStats().size).toBe(2);
  });

  it('clears all entries and resets size', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.clear();

    expect(cache.getStats().size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBeUndefined();
  });
});
