export interface PulseReaperConfig {
  readonly sweepIntervalMs?: number;
  readonly tombstoneTtlMs?: number;
  readonly erasurePropagationTimeoutMs?: number;
}

export interface PulseErasureRequest {
  readonly soul: string;
  readonly requestedAt: number;
  readonly requestedBy: string;
  readonly signature: Uint8Array;
}

export interface PulseErasureReceipt {
  readonly soul: string;
  readonly erasedAt: number;
  readonly relayId: string;
}

export interface PulseReaperInstance {
  readonly scheduleExpiry: (soul: string, expiresAt: number) => void;
  readonly checkExpired: () => string[];
  readonly createErasureRequest: (options: {
    soul: string;
    requestedBy: string;
    signature: Uint8Array;
  }) => PulseErasureRequest;
  readonly processErasureReceipt: (receipt: PulseErasureReceipt) => void;
  readonly getPendingErasures: () => PulseErasureRequest[];
  readonly destroy: () => void;
}
