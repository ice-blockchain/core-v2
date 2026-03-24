export enum PermissionType {
  Camera = "camera",
  Photos = "photos",
  Microphone = "microphone",
  Notifications = "notifications",
  Cloud = "cloud",
}

export enum PermissionStatus {
  Granted = "granted",
  Denied = "denied",
  Limited = "limited",
  PermanentlyDenied = "blocked",
  Restricted = "restricted",
  Provisional = "provisional",
  Unknown = "unknown",
  NotAvailable = "not_available",
}

export interface PermissionResult {
  type: PermissionType;
  status: PermissionStatus;
}

export interface PermissionsConfig {
  types?: PermissionType[];
}

export type PermissionChangeListener = (
  result: PermissionResult,
) => void;
