import { Platform } from "react-native";
import {
  request,
  PERMISSIONS,
} from "react-native-permissions";
import type { Permission } from "react-native-permissions";
import {
  PermissionType,
  PermissionStatus,
  type PermissionResult,
} from "../types";
import { mapNativeStatus } from "./map-native-status";

function getIosPermission(type: PermissionType): Permission | null {
  const map: Record<string, Permission> = {
    [PermissionType.Camera]: PERMISSIONS.IOS.CAMERA,
    [PermissionType.Photos]: PERMISSIONS.IOS.PHOTO_LIBRARY,
    [PermissionType.Microphone]: PERMISSIONS.IOS.MICROPHONE,
    [PermissionType.Notifications]: PERMISSIONS.IOS.NOTIFICATIONS,
  };
  return map[type] ?? null;
}

function getAndroidPermission(type: PermissionType): Permission | null {
  if (type === PermissionType.Photos) {
    return Platform.Version >= 33
      ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  }

  const map: Record<string, Permission> = {
    [PermissionType.Camera]: PERMISSIONS.ANDROID.CAMERA,
    [PermissionType.Microphone]: PERMISSIONS.ANDROID.RECORD_AUDIO,
    [PermissionType.Notifications]: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
  };
  return map[type] ?? null;
}

async function requestAndroidPhotos(): Promise<PermissionResult> {
  if (Platform.Version < 33) {
    const status = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    return { type: PermissionType.Photos, status: mapNativeStatus(status) };
  }

  const [images, video] = await Promise.all([
    request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES),
    request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO),
  ]);

  const imageStatus = mapNativeStatus(images);
  const videoStatus = mapNativeStatus(video);

  const mostRestrictive =
    imageStatus === PermissionStatus.Granted &&
    videoStatus === PermissionStatus.Granted
      ? PermissionStatus.Granted
      : imageStatus !== PermissionStatus.Granted
        ? imageStatus
        : videoStatus;

  return { type: PermissionType.Photos, status: mostRestrictive };
}

export async function requestPermission(
  type: PermissionType,
): Promise<PermissionResult> {
  if (type === PermissionType.Cloud) {
    return {
      type,
      status:
        Platform.OS === "android"
          ? PermissionStatus.Granted
          : PermissionStatus.NotAvailable,
    };
  }

  if (type === PermissionType.Photos && Platform.OS === "android") {
    return requestAndroidPhotos();
  }

  const permission =
    Platform.OS === "ios"
      ? getIosPermission(type)
      : getAndroidPermission(type);

  if (!permission) {
    return { type, status: PermissionStatus.NotAvailable };
  }

  const nativeStatus = await request(permission);
  return { type, status: mapNativeStatus(nativeStatus) };
}
