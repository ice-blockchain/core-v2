declare module "react-native-mmkv" {
  interface MMKVConfiguration {
    id: string;
    encryptionKey?: string | undefined;
  }

  class MMKV {
    constructor(config: MMKVConfiguration);
    getString(key: string): string | undefined;
    set(key: string, value: string | number | boolean): void;
    getNumber(key: string): number | undefined;
    getBoolean(key: string): boolean | undefined;
    delete(key: string): void;
    contains(key: string): boolean;
    clearAll(): void;
  }
}

declare module "expo-secure-store" {
  function getItemAsync(key: string): Promise<string | null>;
  function setItemAsync(key: string, value: string): Promise<void>;
  function deleteItemAsync(key: string): Promise<void>;
}

declare module "@op-engineering/op-sqlite" {
  interface OPSQLiteConnection {
    execute(sql: string, params?: unknown[]): QueryResult;
    executeAsync(sql: string, params?: unknown[]): Promise<QueryResult>;
    executeBatch(
      commands: Array<{ sql: string; params?: unknown[] }>,
    ): Promise<BatchResult>;
    close(): void;
    delete(): void;
  }

  interface QueryResult {
    insertId?: number | undefined;
    rowsAffected: number;
    rows: Record<string, unknown>[];
  }

  interface BatchResult {
    rowsAffected: number;
  }

  function open(options: { name: string; location?: string }): OPSQLiteConnection;
}

declare module "@journeyapps/wa-sqlite" {
  export default class SQLiteAsyncESMFactory {
    static default(config?: Record<string, unknown>): Promise<SQLiteAPI>;
  }

  export interface SQLiteAPI {
    open_v2(
      filename: string,
      flags?: number,
      vfs?: string,
    ): number;
    exec(db: number, sql: string): number;
    prepare_v2(db: number, sql: string): PreparedStatement | null;
    bind(stmt: PreparedStatement, index: number, value: unknown): number;
    step(stmt: PreparedStatement): number;
    column_count(stmt: PreparedStatement): number;
    column_name(stmt: PreparedStatement, index: number): string;
    column(stmt: PreparedStatement, index: number): unknown;
    finalize(stmt: PreparedStatement): number;
    close(db: number): number;
    changes(db: number): number;
  }

  export type PreparedStatement = number;

  export const SQLITE_OK: number;
  export const SQLITE_ROW: number;
  export const SQLITE_DONE: number;
  export const SQLITE_OPEN_CREATE: number;
  export const SQLITE_OPEN_READWRITE: number;
}

declare module "@aspect-build/wa-sqlite/src/vfs/OPFSCoopSyncVFS" {
  import type { SQLiteAPI } from "@journeyapps/wa-sqlite";

  export class OPFSCoopSyncVFS {
    static create(
      name: string,
      module: SQLiteAPI,
    ): Promise<OPFSCoopSyncVFS>;
    close(): void;
  }
}
