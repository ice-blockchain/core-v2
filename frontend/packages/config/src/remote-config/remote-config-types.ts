// --- Dependency injection interfaces (consumers provide implementations) ---

export interface ConfigHttpClient {
  get(url: string, options?: ConfigRequestOptions): Promise<ConfigHttpResponse>;
}

export interface ConfigRequestOptions {
  query?: Record<string, string> | undefined;
}

export interface ConfigHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface ConfigStorage {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  getNumber(key: string): number | null;
  setNumber(key: string, value: number): void;
  removeItem(key: string): void;
}

// --- Configuration ---

export interface RemoteConfigOptions {
  httpClient: ConfigHttpClient;
  storage: ConfigStorage;
  baseUrl: string;
  defaultTimeToLiveMs?: number;
}

export interface GetConfigOptions<T> {
  configName: string;
  parser: (raw: string) => T;
  timeToLiveMs?: number;
  checkVersion?: boolean;
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
  httpClient: ConfigHttpClient;
  storage: ConfigStorage;
  baseUrl: string;
  defaultTimeToLiveMs: number;
  memoryCache: Map<string, CachedEntry>;
}

// --- Public service ---

export interface RemoteConfigService {
  getConfig<T>(options: GetConfigOptions<T>): Promise<T>;
  clearLocks(): void;
}
