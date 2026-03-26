import { createReaperStorage } from './pulse-reaper-storage.js';
import type {
  ErasureHandler,
  PulseErasureReceipt,
  PulseErasureRequest,
  PulseReaper,
  PulseReaperConfig,
  PulseTombstone,
} from './types.js';

const DEFAULT_SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_TOMBSTONE_TTL_MS = 2_592_000_000;
const DEFAULT_ERASURE_PROPAGATION_TIMEOUT_MS = 30_000;

interface ResolvedConfig {
  sweepIntervalMs: number;
  tombstoneTtlMs: number;
  erasurePropagationTimeoutMs: number;
}

function resolveConfig(config?: PulseReaperConfig): ResolvedConfig {
  return {
    sweepIntervalMs: config?.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS,
    tombstoneTtlMs: config?.tombstoneTtlMs ?? DEFAULT_TOMBSTONE_TTL_MS,
    erasurePropagationTimeoutMs:
      config?.erasurePropagationTimeoutMs ??
      DEFAULT_ERASURE_PROPAGATION_TIMEOUT_MS,
  };
}

export function createPulseReaper(config?: PulseReaperConfig): PulseReaper {
  const resolved = resolveConfig(config);
  const storage = createReaperStorage();
  const handlers = new Set<ErasureHandler>();
  let sweepInterval: ReturnType<typeof setInterval> | null = null;

  function addTombstone(soul: string): void {
    const now = Date.now();
    const tombstone: PulseTombstone = {
      soul,
      deletedAt: now,
      expiresAt: now + resolved.tombstoneTtlMs,
    };
    storage.addTombstone(tombstone);
  }

  function getTombstone(soul: string): PulseTombstone | undefined {
    return storage.getTombstone(soul);
  }

  function registerErasureHandler(handler: ErasureHandler): void {
    handlers.add(handler);
  }

  async function requestErasure(
    request: PulseErasureRequest,
  ): Promise<PulseErasureReceipt[]> {
    const promises = Array.from(handlers).map((handler) =>
      executeErasureHandler(handler, request, resolved),
    );
    const results = await Promise.allSettled(promises);
    return collectFulfilledReceipts(results);
  }

  function sweep(): { expiredNodes: string[]; prunedTombstones: string[] } {
    const now = Date.now();
    const expired = storage.getExpiredTombstones(now);
    const prunedTombstones: string[] = [];

    for (const tombstone of expired) {
      storage.removeTombstone(tombstone.soul);
      prunedTombstones.push(tombstone.soul);
    }

    return { expiredNodes: prunedTombstones, prunedTombstones };
  }

  function startAutoSweep(): void {
    if (sweepInterval !== null) {
      return;
    }
    sweepInterval = setInterval(() => sweep(), resolved.sweepIntervalMs);
  }

  function stopAutoSweep(): void {
    if (sweepInterval === null) {
      return;
    }
    clearInterval(sweepInterval);
    sweepInterval = null;
  }

  function destroy(): void {
    stopAutoSweep();
    handlers.clear();
  }

  return {
    addTombstone,
    requestErasure,
    registerErasureHandler,
    sweep,
    getTombstone,
    startAutoSweep,
    stopAutoSweep,
    destroy,
  };
}

async function executeErasureHandler(
  handler: ErasureHandler,
  request: PulseErasureRequest,
  config: ResolvedConfig,
): Promise<PulseErasureReceipt> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('Erasure handler timed out')),
      config.erasurePropagationTimeoutMs,
    );
  });
  return Promise.race([handler(request), timeout]);
}

function collectFulfilledReceipts(
  results: PromiseSettledResult<PulseErasureReceipt>[],
): PulseErasureReceipt[] {
  const receipts: PulseErasureReceipt[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      receipts.push(result.value);
    }
  }
  return receipts;
}
