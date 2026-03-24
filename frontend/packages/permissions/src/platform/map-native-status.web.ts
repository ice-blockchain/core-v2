import { PermissionStatus } from "../types";

const STATE_MAP: Record<string, PermissionStatus> = {
  granted: PermissionStatus.Granted,
  denied: PermissionStatus.PermanentlyDenied,
  prompt: PermissionStatus.Denied,
};

export function mapNativeStatus(state: string): PermissionStatus {
  return STATE_MAP[state] ?? PermissionStatus.Unknown;
}
