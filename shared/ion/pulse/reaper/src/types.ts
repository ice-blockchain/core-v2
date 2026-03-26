export interface PulseReaperConfig {
  sweepIntervalMs?: number;
  tombstoneTtlMs?: number;
  erasurePropagationTimeoutMs?: number;
}

export interface PulseErasureRequest {
  soul: string;
  requestedAt: number;
  requestedBy: string;
  signature?: Uint8Array;
}

export interface PulseErasureReceipt {
  soul: string;
  erasedAt: number;
  erasedBy: string;
  success: boolean;
}

export interface PulseTombstone {
  soul: string;
  deletedAt: number;
  expiresAt: number;
}

export interface ReaperStorage {
  getExpiredNodes(now: number): PulseTombstone[];
  getExpiredTombstones(now: number): PulseTombstone[];
  removeTombstone(soul: string): boolean;
  addTombstone(tombstone: PulseTombstone): void;
  getTombstone(soul: string): PulseTombstone | undefined;
  getAllTombstones(): PulseTombstone[];
}

export type ErasureHandler = (
  request: PulseErasureRequest,
) => Promise<PulseErasureReceipt>;

export interface PulseReaper {
  addTombstone(soul: string): void;
  requestErasure(
    request: PulseErasureRequest,
  ): Promise<PulseErasureReceipt[]>;
  registerErasureHandler(handler: ErasureHandler): void;
  sweep(): { expiredNodes: string[]; prunedTombstones: string[] };
  getTombstone(soul: string): PulseTombstone | undefined;
  startAutoSweep(): void;
  stopAutoSweep(): void;
  destroy(): void;
}
