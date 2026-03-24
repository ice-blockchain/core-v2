import type { PermissionType, PermissionResult } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function checkPermission(
  _type: PermissionType,
): Promise<PermissionResult> {
  throw new Error("Platform implementation not resolved");
}
