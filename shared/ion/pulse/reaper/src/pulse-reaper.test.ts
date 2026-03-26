import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPulseReaper } from './pulse-reaper.js';
import type { PulseErasureRequest, PulseErasureReceipt } from './types.js';

describe('createPulseReaper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a retrievable tombstone', () => {
    const reaper = createPulseReaper();
    reaper.addTombstone('node-1');

    const tombstone = reaper.getTombstone('node-1');
    expect(tombstone).toBeDefined();
    expect(tombstone?.soul).toBe('node-1');
    expect(tombstone?.deletedAt).toBeGreaterThan(0);
    expect(tombstone?.expiresAt).toBeGreaterThan(tombstone!.deletedAt);

    reaper.destroy();
  });

  it('sweep removes expired tombstones', async () => {
    const reaper = createPulseReaper({ tombstoneTtlMs: 50 });
    reaper.addTombstone('expired-1');
    reaper.addTombstone('expired-2');

    await new Promise((resolve) => setTimeout(resolve, 80));

    const result = reaper.sweep();
    expect(result.prunedTombstones).toContain('expired-1');
    expect(result.prunedTombstones).toContain('expired-2');
    expect(reaper.getTombstone('expired-1')).toBeUndefined();
    expect(reaper.getTombstone('expired-2')).toBeUndefined();

    reaper.destroy();
  });

  it('sweep does not remove non-expired tombstones', () => {
    const reaper = createPulseReaper({ tombstoneTtlMs: 600_000 });
    reaper.addTombstone('fresh-1');

    const result = reaper.sweep();
    expect(result.prunedTombstones).toHaveLength(0);
    expect(reaper.getTombstone('fresh-1')).toBeDefined();

    reaper.destroy();
  });

  it('calls all erasure handlers and returns receipts', async () => {
    const reaper = createPulseReaper();

    const receipt1: PulseErasureReceipt = {
      soul: 'node-1',
      erasedAt: Date.now(),
      erasedBy: 'handler-a',
      success: true,
    };
    const receipt2: PulseErasureReceipt = {
      soul: 'node-1',
      erasedAt: Date.now(),
      erasedBy: 'handler-b',
      success: true,
    };

    reaper.registerErasureHandler(async () => receipt1);
    reaper.registerErasureHandler(async () => receipt2);

    const request: PulseErasureRequest = {
      soul: 'node-1',
      requestedAt: Date.now(),
      requestedBy: 'user-1',
    };

    const receipts = await reaper.requestErasure(request);
    expect(receipts).toHaveLength(2);
    expect(receipts).toContainEqual(receipt1);
    expect(receipts).toContainEqual(receipt2);

    reaper.destroy();
  });

  it('handles partial erasure handler failures gracefully', async () => {
    const reaper = createPulseReaper();

    const successReceipt: PulseErasureReceipt = {
      soul: 'node-1',
      erasedAt: Date.now(),
      erasedBy: 'handler-ok',
      success: true,
    };

    reaper.registerErasureHandler(async () => successReceipt);
    reaper.registerErasureHandler(async () => {
      throw new Error('Handler crashed');
    });

    const request: PulseErasureRequest = {
      soul: 'node-1',
      requestedAt: Date.now(),
      requestedBy: 'user-1',
    };

    const receipts = await reaper.requestErasure(request);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toEqual(successReceipt);

    reaper.destroy();
  });

  it('startAutoSweep runs periodic sweeps', async () => {
    const reaper = createPulseReaper({
      sweepIntervalMs: 50,
      tombstoneTtlMs: 10,
    });
    reaper.addTombstone('auto-1');

    reaper.startAutoSweep();
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(reaper.getTombstone('auto-1')).toBeUndefined();

    reaper.stopAutoSweep();
    reaper.destroy();
  });

  it('stopAutoSweep halts periodic sweeps', async () => {
    const reaper = createPulseReaper({
      sweepIntervalMs: 30,
      tombstoneTtlMs: 10,
    });

    reaper.startAutoSweep();
    reaper.stopAutoSweep();

    reaper.addTombstone('no-sweep');
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(reaper.getTombstone('no-sweep')).toBeDefined();

    reaper.destroy();
  });

  it('destroy clears handlers and stops sweep', async () => {
    const reaper = createPulseReaper({ sweepIntervalMs: 30 });

    reaper.registerErasureHandler(async () => ({
      soul: 'x',
      erasedAt: Date.now(),
      erasedBy: 'h',
      success: true,
    }));
    reaper.startAutoSweep();
    reaper.destroy();

    const request: PulseErasureRequest = {
      soul: 'x',
      requestedAt: Date.now(),
      requestedBy: 'user-1',
    };
    const receipts = await reaper.requestErasure(request);
    expect(receipts).toHaveLength(0);
  });
});
