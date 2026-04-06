import type { ConnectionState, NetworkStateProvider } from '@ion/network';
import type { AppStateProvider } from '@ion/platform';

// --- TON Global Config ---

/** Raw JSON string of the TON global config. Passed directly to the native module to avoid JS number precision loss on int64 fields. */
export type TonGlobalConfigJSON = string;

export interface StartTonStorageOptions {
  apiPort: number;
  dbPath: string;
  globalConfigJSON?: TonGlobalConfigJSON | undefined;
}

// --- Bag Types ---

export interface BagInfo {
  bagId: string;
  description: string;
  totalSize: number;
  downloadedSize: number;
  filesCount: number;
  dirName: string;
  isComplete: boolean;
  isActive: boolean;
  isSeeding: boolean;
  isHeaderLoaded: boolean;
  peers: number;
  uploadSpeed: number;
  downloadSpeed: number;
}

export interface BagFile {
  index: number;
  name: string;
  size: number;
}

export interface PeerInfo {
  address: string;
  id: string;
  uploadSpeed: number;
  downloadSpeed: number;
}

export interface BagDetails extends BagInfo {
  files: BagFile[];
  pieceSize: number;
  piecesCount: number;
  activePeers: PeerInfo[];
  path: string;
}

// --- Download Request ---

export interface AddBagRequest {
  bagId: string;
  /** Download all files or specific file indices. Default: all. */
  files?: number[] | undefined;
  /** Directory to store downloaded files. */
  downloadPath: string;
  /** Download all files. Default: true. */
  downloadAll?: boolean | undefined;
}

// --- Storage Manager ---

export type StorageStatus = ConnectionState;

export interface StorageManagerConfig {
  apiPort?: number | undefined;
  dbPath: string;
  globalConfigJSON?: TonGlobalConfigJSON | undefined;
  networkStateProvider?: NetworkStateProvider | undefined;
  appStateProvider?: AppStateProvider | undefined;
  healthCheckIntervalMs?: number | undefined;
  maxRestartAttempts?: number | undefined;
  restartBaseDelayMs?: number | undefined;
}

export interface StorageManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): StorageStatus;
  onStatusChange(handler: (status: StorageStatus) => void): () => void;
  createClient(): TonStorageClient;
  dispose(): void;
}

// --- Storage Client (wraps HTTP API) ---

export interface TonStorageClient {
  addBag(request: AddBagRequest): Promise<void>;
  removeBag(bagId: string, deleteFiles?: boolean): Promise<void>;
  stopBag(bagId: string): Promise<void>;
  getBagDetails(bagId: string): Promise<BagDetails>;
  listBags(): Promise<BagInfo[]>;
  getFilePath(bagId: string, fileIndex: number): string;
}

// --- Internal Shared Context ---

export interface StorageManagerContext {
  apiPort: number;
  dbPath: string;
  globalConfigJSON?: TonGlobalConfigJSON | undefined;
  healthCheckIntervalMs: number;
  maxRestartAttempts: number;
  restartBaseDelayMs: number;
  transition(to: StorageStatus): void;
  getStatus(): StorageStatus;
  onStatusChange(handler: (status: StorageStatus) => void): () => void;
  isRestarting: boolean;
  restartPromise: Promise<void> | null;
  healthTimerId: ReturnType<typeof setInterval> | null;
  disposed: boolean;
}
