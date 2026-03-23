// --- Secure Storage ---

export interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  hasItem(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

// --- Key-Value Storage ---

export interface IKeyValueStorage {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  getNumber(key: string): number | null;
  setNumber(key: string, value: number): void;
  getBoolean(key: string): boolean | null;
  setBoolean(key: string, value: boolean): void;
  getObject<T>(key: string): T | null;
  setObject<T>(key: string, value: T): void;
  removeItem(key: string): void;
  hasItem(key: string): boolean;
  clear(): void;
}

// --- Database Storage ---

export interface IDatabaseStorage {
  getDatabase(options: DatabaseOptions): Database;
  closeDatabase(name: string): Promise<void>;
  deleteDatabase(name: string): Promise<void>;
}

export interface DatabaseOptions {
  name: string;
  migrations: Migration[];
}

export interface Migration {
  version: number;
  up: string;
}

export interface Database {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  executeBatch(
    statements: Array<{ sql: string; params?: unknown[] }>,
  ): Promise<void>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

export interface Transaction {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

// --- Memory Storage ---

export interface IMemoryStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, options?: CacheOptions): void;
  remove(key: string): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

export interface CacheOptions {
  timeToLiveMs?: number;
  priority?: "low" | "normal" | "high";
}
