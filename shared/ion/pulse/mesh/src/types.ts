export interface PulseMeshConfig {
  readonly listenAddresses?: string[];
  readonly bootstrapPeers?: string[];
  readonly relayMode?: boolean;
  readonly maxConnections?: number;
}

export interface PulseMeshMessage {
  readonly topic: string;
  readonly data: Uint8Array;
  readonly from: string;
}

export type PulseMeshMessageHandler = (message: PulseMeshMessage) => void;

export interface PulseMeshNode {
  readonly start: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly publish: (topic: string, data: Uint8Array) => Promise<void>;
  readonly subscribe: (topic: string, handler: PulseMeshMessageHandler) => () => void;
  readonly getPeerId: () => string;
  readonly getPeerCount: () => number;
}
