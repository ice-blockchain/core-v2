import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createPulseReaper } from './pulse-reaper';

describe('createPulseReaper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns expired souls after their expiry time', () => {
    const reaper = createPulseReaper();
    const now = Date.now();

    reaper.scheduleExpiry('soul-1', now + 1000);
    reaper.scheduleExpiry('soul-2', now + 2000);

    vi.advanceTimersByTime(1500);
    const expired = reaper.checkExpired();

    expect(expired).toContain('soul-1');
    expect(expired).not.toContain('soul-2');
  });

  it('does not return non-expired souls', () => {
    const reaper = createPulseReaper();
    const now = Date.now();

    reaper.scheduleExpiry('soul-future', now + 10000);

    const expired = reaper.checkExpired();

    expect(expired).toEqual([]);
  });

  it('returns multiple expired souls in order', () => {
    const reaper = createPulseReaper();
    const now = Date.now();

    reaper.scheduleExpiry('soul-c', now + 3000);
    reaper.scheduleExpiry('soul-a', now + 1000);
    reaper.scheduleExpiry('soul-b', now + 2000);

    vi.advanceTimersByTime(3500);
    const expired = reaper.checkExpired();

    expect(expired).toEqual(['soul-a', 'soul-b', 'soul-c']);
  });

  it('removes expired souls so they are not returned again', () => {
    const reaper = createPulseReaper();
    const now = Date.now();

    reaper.scheduleExpiry('soul-once', now + 1000);

    vi.advanceTimersByTime(1500);
    const firstCheck = reaper.checkExpired();
    const secondCheck = reaper.checkExpired();

    expect(firstCheck).toContain('soul-once');
    expect(secondCheck).toEqual([]);
  });

  it('creates a valid erasure request', () => {
    const reaper = createPulseReaper();
    const signature = new Uint8Array([1, 2, 3, 4]);

    const request = reaper.createErasureRequest({
      soul: 'soul-erase',
      requestedBy: 'user-123',
      signature,
    });

    expect(request.soul).toBe('soul-erase');
    expect(request.requestedBy).toBe('user-123');
    expect(request.signature).toBe(signature);
    expect(request.requestedAt).toBeGreaterThan(0);
  });

  it('tracks pending erasures until receipt is processed', () => {
    const reaper = createPulseReaper();
    const signature = new Uint8Array([5, 6, 7]);

    reaper.createErasureRequest({
      soul: 'soul-pending',
      requestedBy: 'user-456',
      signature,
    });

    expect(reaper.getPendingErasures()).toHaveLength(1);
    expect(reaper.getPendingErasures()[0].soul).toBe('soul-pending');
  });

  it('removes erasure from pending after receipt is processed', () => {
    const reaper = createPulseReaper();
    const signature = new Uint8Array([8, 9]);

    reaper.createErasureRequest({
      soul: 'soul-confirmed',
      requestedBy: 'user-789',
      signature,
    });

    reaper.processErasureReceipt({
      soul: 'soul-confirmed',
      erasedAt: Date.now(),
      relayId: 'relay-a',
    });

    expect(reaper.getPendingErasures()).toHaveLength(0);
  });

  it('cleans up all state on destroy', () => {
    const reaper = createPulseReaper();
    const now = Date.now();

    reaper.scheduleExpiry('soul-1', now + 1000);
    reaper.createErasureRequest({
      soul: 'soul-2',
      requestedBy: 'user-x',
      signature: new Uint8Array([1]),
    });

    reaper.destroy();

    vi.advanceTimersByTime(2000);
    expect(reaper.checkExpired()).toEqual([]);
    expect(reaper.getPendingErasures()).toEqual([]);
  });
});
