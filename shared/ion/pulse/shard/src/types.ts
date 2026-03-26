export interface ShardNode {
  peerId: string;
  load: number;
  isHealthy: boolean;
  lastSeen: number;
}

export interface PulseShardConfig {
  minReplicas?: number;
  maxReplicas?: number;
  virtualNodesPerPeer?: number;
  repairThresholdMs?: number;
}

export interface PulseShard {
  addPeer(peerId: string): void;
  removePeer(peerId: string): void;
  getShardOwners(soul: string): string[];
  isLocalShard(soul: string, localPeerId: string): boolean;
  getPeerLoad(peerId: string): number;
  updatePeerLoad(peerId: string, load: number): void;
  markPeerHealthy(peerId: string): void;
  markPeerDegraded(peerId: string): void;
  isPeerStale(peerId: string): boolean;
  getHealthyPeers(): string[];
  getAllPeers(): ShardNode[];
  getRingSize(): number;
  destroy(): void;
}
