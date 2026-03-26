export type PulseMeshPlatform = 'server' | 'browser' | 'react-native';

export interface PulseMeshConfig {
  platform: PulseMeshPlatform;
  listenAddresses?: string[];
  bootstrapPeers?: string[];
  maxConnections?: number;
}

export type PulseMessageType = 'sync-step1' | 'sync-step2' | 'awareness' | 'erasure';

export interface PulseMessage {
  type: PulseMessageType;
  topic: string;
  data: Uint8Array;
  from?: string;
}

export type PulseMessageHandler = (message: PulseMessage) => void;

export interface PulseMesh {
  start(): Promise<void>;
  stop(): Promise<void>;
  publish(topic: string, message: PulseMessage): Promise<void>;
  subscribe(topic: string, handler: PulseMessageHandler): () => void;
  getPeerId(): string;
  getConnectedPeers(): string[];
  isStarted(): boolean;
}
