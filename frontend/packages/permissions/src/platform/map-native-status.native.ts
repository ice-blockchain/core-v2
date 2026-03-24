import { RESULTS } from "react-native-permissions";
import { PermissionStatus } from "../types";

const STATUS_MAP: Record<string, PermissionStatus> = {
  [RESULTS.GRANTED]: PermissionStatus.Granted,
  [RESULTS.DENIED]: PermissionStatus.Denied,
  [RESULTS.BLOCKED]: PermissionStatus.PermanentlyDenied,
  [RESULTS.LIMITED]: PermissionStatus.Limited,
  [RESULTS.UNAVAILABLE]: PermissionStatus.NotAvailable,
};

export function mapNativeStatus(status: string): PermissionStatus {
  return STATUS_MAP[status] ?? PermissionStatus.Unknown;
}
