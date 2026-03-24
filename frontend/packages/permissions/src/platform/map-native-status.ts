import type { PermissionStatus } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function mapNativeStatus(_status: string): PermissionStatus {
  throw new Error("Platform implementation not resolved");
}
