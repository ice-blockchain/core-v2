import { describe, it, expect, vi } from 'vitest';

import { createConfigMutex } from './config-mutex';

describe('createConfigMutex', () => {
  it('returns the factory result', async () => {
    const mutex = createConfigMutex();
    const result = await mutex.run('key', () => Promise.resolve(42));

    expect(result).toBe(42);
  });

  it('deduplicates concurrent calls for the same key', async () => {
    const mutex = createConfigMutex();
    const factory = vi.fn(() => Promise.resolve('data'));

    const [resultA, resultB] = await Promise.all([
      mutex.run('same', factory),
      mutex.run('same', factory),
    ]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(resultA).toBe('data');
    expect(resultB).toBe('data');
  });

  it('runs different keys independently', async () => {
    const mutex = createConfigMutex();
    const factoryA = vi.fn(() => Promise.resolve('a'));
    const factoryB = vi.fn(() => Promise.resolve('b'));

    const [resultA, resultB] = await Promise.all([
      mutex.run('keyA', factoryA),
      mutex.run('keyB', factoryB),
    ]);

    expect(factoryA).toHaveBeenCalledTimes(1);
    expect(factoryB).toHaveBeenCalledTimes(1);
    expect(resultA).toBe('a');
    expect(resultB).toBe('b');
  });

  it('removes pending entry after resolution', async () => {
    const mutex = createConfigMutex();
    await mutex.run('key', () => Promise.resolve('done'));

    const factory = vi.fn(() => Promise.resolve('second'));
    await mutex.run('key', factory);

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('removes pending entry after rejection', async () => {
    const mutex = createConfigMutex();
    await mutex.run('key', () => Promise.reject(new Error('fail'))).catch(() => {});

    const factory = vi.fn(() => Promise.resolve('recovered'));
    const result = await mutex.run('key', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toBe('recovered');
  });

  it('clears all pending entries', () => {
    const mutex = createConfigMutex();
    mutex.run('a', () => new Promise(() => {}));
    mutex.run('b', () => new Promise(() => {}));

    mutex.clear();

    const factory = vi.fn(() => Promise.resolve('new'));
    mutex.run('a', factory);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
