import type { PermissionType, PermissionResult } from "./types";
import * as store from "./permission-store";

type CheckFunction = (type: PermissionType) => Promise<PermissionResult>;

export async function refreshPermissions(
  types: PermissionType[],
  checkPermission: CheckFunction,
): Promise<void> {
  const results = await Promise.all(
    types.map((type) => checkPermission(type)),
  );

  for (const result of results) {
    store.update(result);
  }
}
