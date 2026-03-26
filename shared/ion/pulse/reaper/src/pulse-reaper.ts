import type {
  PulseReaperConfig,
  PulseReaperInstance,
  PulseErasureRequest,
  PulseErasureReceipt,
} from './types';

interface ExpiryEntry {
  readonly soul: string;
  readonly expiresAt: number;
}

function insertByExpiry(entries: ExpiryEntry[], entry: ExpiryEntry): void {
  let low = 0;
  let high = entries.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (entries[mid].expiresAt < entry.expiresAt) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  entries.splice(low, 0, entry);
}

function collectExpiredSouls(entries: ExpiryEntry[], now: number): string[] {
  const expired: string[] = [];

  while (entries.length > 0 && entries[0].expiresAt <= now) {
    const entry = entries.shift();
    if (entry) {
      expired.push(entry.soul);
    }
  }

  return expired;
}

export function createPulseReaper(config?: PulseReaperConfig): PulseReaperInstance {
  const _config = config;
  void _config;

  const expiryList: ExpiryEntry[] = [];
  const pendingErasures = new Map<string, PulseErasureRequest>();

  function scheduleExpiry(soul: string, expiresAt: number): void {
    insertByExpiry(expiryList, { soul, expiresAt });
  }

  function checkExpired(): string[] {
    return collectExpiredSouls(expiryList, Date.now());
  }

  function createErasureRequest(options: {
    soul: string;
    requestedBy: string;
    signature: Uint8Array;
  }): PulseErasureRequest {
    const request: PulseErasureRequest = {
      soul: options.soul,
      requestedAt: Date.now(),
      requestedBy: options.requestedBy,
      signature: options.signature,
    };

    pendingErasures.set(options.soul, request);
    return request;
  }

  function processErasureReceipt(receipt: PulseErasureReceipt): void {
    pendingErasures.delete(receipt.soul);
  }

  function getPendingErasures(): PulseErasureRequest[] {
    return Array.from(pendingErasures.values());
  }

  function destroy(): void {
    expiryList.length = 0;
    pendingErasures.clear();
  }

  return {
    scheduleExpiry,
    checkExpired,
    createErasureRequest,
    processErasureReceipt,
    getPendingErasures,
    destroy,
  };
}
