import {
  PermissionType,
  PermissionStatus,
  type PermissionResult,
} from "../types";
import { checkPermission } from "./check-permission";

function releaseStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch { /* best-effort cleanup */ }
  }
}

async function requestMediaPermission(
  type: PermissionType,
  constraints: MediaStreamConstraints,
): Promise<PermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return { type, status: PermissionStatus.NotAvailable };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    releaseStream(stream);
    return { type, status: PermissionStatus.Granted };
  } catch (error: unknown) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError") {
      return { type, status: PermissionStatus.PermanentlyDenied };
    }
    return { type, status: PermissionStatus.NotAvailable };
  }
}

async function requestNotificationPermission(): Promise<PermissionResult> {
  if (typeof Notification === "undefined") {
    return {
      type: PermissionType.Notifications,
      status: PermissionStatus.NotAvailable,
    };
  }

  const result = await Notification.requestPermission();
  const statusMap: Record<string, PermissionStatus> = {
    granted: PermissionStatus.Granted,
    denied: PermissionStatus.PermanentlyDenied,
    default: PermissionStatus.Denied,
  };

  return {
    type: PermissionType.Notifications,
    status: statusMap[result] ?? PermissionStatus.Unknown,
  };
}

export async function requestPermission(
  type: PermissionType,
): Promise<PermissionResult> {
  if (type === PermissionType.Camera) {
    return requestMediaPermission(type, { video: true });
  }

  if (type === PermissionType.Microphone) {
    return requestMediaPermission(type, { audio: true });
  }

  if (type === PermissionType.Notifications) {
    return requestNotificationPermission();
  }

  if (type === PermissionType.Photos) {
    return { type, status: PermissionStatus.Granted };
  }

  if (type === PermissionType.Cloud) {
    return { type, status: PermissionStatus.NotAvailable };
  }

  return checkPermission(type);
}
