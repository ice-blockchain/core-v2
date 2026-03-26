export interface PulseShardConfig {
  readonly virtualNodes?: number;
  readonly minReplicas?: number;
  readonly maxReplicas?: number;
  readonly repairThresholdMs?: number;
}

export interface PulseShardRing {
  readonly addRelay: (relayId: string) => void;
  readonly removeRelay: (relayId: string) => void;
  readonly getShardOwners: (soul: string) => string[];
  readonly isLocalShard: (soul: string, localRelayId: string) => boolean;
  readonly getRelayCount: () => number;
}
