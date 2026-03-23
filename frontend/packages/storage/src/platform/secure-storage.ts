import type { ISecureStorage } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function createSecureStorage(_password: string): ISecureStorage {
  throw new Error("Platform implementation not resolved");
}
