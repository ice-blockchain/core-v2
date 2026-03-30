import type { HttpClient } from '@ion/network';
import type { IKeyValueStorage } from '@ion/storage';

// --- Configuration ---

export interface RemoteConfigOptions {
  httpClient?: HttpClient;
  storage?: IKeyValueStorage;
}

export interface GetConfigOptions<T> {
  configName: string;
  parser: (raw: string) => T;
  checkVersion?: boolean;
  timeToLiveMs?: number;
}

// --- Version-aware config ---

export interface AppConfigWithVersion {
  readonly version: number;
}

// --- Internal types ---

export interface CachedEntry {
  raw: string;
  version: number;
  fetchedAtMs: number;
}

export interface RemoteConfigDeps {
  httpClient: HttpClient;
  storage: IKeyValueStorage;
  memoryCache: Map<string, CachedEntry>;
}

export interface ConfigIdentity<T> {
  configName: string;
  parser: (raw: string) => T;
  checkVersion: boolean;
}

// --- Public service ---

export interface RemoteConfigService {
  getConfig<T>(options: GetConfigOptions<T>): Promise<T>;
  clearLocks(): void;
}
