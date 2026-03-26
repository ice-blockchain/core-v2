import { describe, it, expect } from 'vitest';

import { createPulseCache } from './pulse-cache';

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

describe('createPulseCache', () => {
  it('stores and retrieves a value by soul', () => {
    const cache = createPulseCache();
    const value = { name: 'Alice', score: 42 };

    cache.set('soul-1', value);
    const retrieved = cache.get('soul-1');

    expect(retrieved).toEqual(value);
  });

  it('returns undefined for non-existent soul', () => {
    const cache = createPulseCache();
    const result = cache.get('nonexistent');

    expect(result).toBeUndefined();
  });

  it('expires entries after TTL', async () => {
    const cache = createPulseCache({ defaultTtlMs: 50 });

    cache.set('soul-ttl', { data: 'temp' });
    expect(cache.get('soul-ttl')).toBeDefined();

    await delay(100);

    expect(cache.get('soul-ttl')).toBeUndefined();
  });

  it('keeps entries alive before TTL expires', async () => {
    const cache = createPulseCache({ defaultTtlMs: 200 });

    cache.set('soul-alive', { data: 'persistent' });

    await delay(50);

    expect(cache.get('soul-alive')).toBeDefined();
  });

  it('invalidates a cached entry and returns true', () => {
    const cache = createPulseCache();
    cache.set('soul-remove', 'value');

    const removed = cache.invalidate('soul-remove');

    expect(removed).toBe(true);
    expect(cache.get('soul-remove')).toBeUndefined();
  });

  it('returns false when invalidating non-existent entry', () => {
    const cache = createPulseCache();
    const removed = cache.invalidate('never-existed');

    expect(removed).toBe(false);
  });

  it('tracks hit and miss stats correctly', () => {
    const cache = createPulseCache();
    cache.set('soul-a', 'value-a');

    cache.get('soul-a');
    cache.get('soul-a');
    cache.get('soul-missing');

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
  });

  it('reports size in stats', () => {
    const cache = createPulseCache();
    cache.set('soul-1', 'value-1');
    cache.set('soul-2', 'value-2');

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
  });

  it('clears all entries from cache', () => {
    const cache = createPulseCache();
    cache.set('soul-1', 'value-1');
    cache.set('soul-2', 'value-2');
    cache.set('soul-3', 'value-3');

    cache.clear();

    expect(cache.get('soul-1')).toBeUndefined();
    expect(cache.get('soul-2')).toBeUndefined();
    expect(cache.get('soul-3')).toBeUndefined();
    expect(cache.getStats().size).toBe(0);
  });
});
