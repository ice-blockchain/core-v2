import type { IDatabaseStorage } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function createDatabaseStorage(): IDatabaseStorage {
  throw new Error("Platform implementation not resolved");
}
