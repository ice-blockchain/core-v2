import { PermissionType, PermissionStatus } from "@ion/permissions";
import type { PermissionFlowResult } from "./types";

export async function requestGalleryPermission(): Promise<PermissionFlowResult> {
  const { Permissions } = await import("@ion/permissions");
  const result = await Permissions.request(PermissionType.Photos);

  if (result.status === PermissionStatus.Granted) return "granted";
  if (result.status === PermissionStatus.Limited) return "limited";
  if (result.status === PermissionStatus.PermanentlyDenied) return "permanently_denied";
  return "denied";
}
