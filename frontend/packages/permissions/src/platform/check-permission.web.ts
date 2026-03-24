import {
  PermissionType,
  PermissionStatus,
  type PermissionResult,
} from "../types";
import { mapNativeStatus } from "./map-native-status";

const QUERY_NAME_MAP: Partial<Record<PermissionType, string>> = {
  [PermissionType.Camera]: "camera",
  [PermissionType.Microphone]: "microphone",
  [PermissionType.Notifications]: "notifications",
};

export async function checkPermission(
  type: PermissionType,
): Promise<PermissionResult> {
  if (type === PermissionType.Photos) {
    return { type, status: PermissionStatus.Granted };
  }

  if (type === PermissionType.Cloud) {
    return { type, status: PermissionStatus.NotAvailable };
  }

  const queryName = QUERY_NAME_MAP[type];
  if (!queryName) {
    return { type, status: PermissionStatus.NotAvailable };
  }

  if (typeof navigator === "undefined" || !navigator.permissions) {
    return { type, status: PermissionStatus.NotAvailable };
  }

  try {
    const result = await navigator.permissions.query({
      name: queryName as PermissionName,
    });
    return { type, status: mapNativeStatus(result.state) };
  } catch {
    return { type, status: PermissionStatus.NotAvailable };
  }
}
