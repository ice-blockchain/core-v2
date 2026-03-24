declare module "react-native-permissions" {
  export const RESULTS: {
    UNAVAILABLE: "unavailable";
    DENIED: "denied";
    LIMITED: "limited";
    GRANTED: "granted";
    BLOCKED: "blocked";
  };

  export const PERMISSIONS: {
    IOS: {
      CAMERA: string;
      MICROPHONE: string;
      PHOTO_LIBRARY: string;
      NOTIFICATIONS: string;
    };
    ANDROID: {
      CAMERA: string;
      RECORD_AUDIO: string;
      READ_MEDIA_IMAGES: string;
      READ_MEDIA_VIDEO: string;
      READ_EXTERNAL_STORAGE: string;
      POST_NOTIFICATIONS: string;
    };
  };

  export type Permission = string;
  export type PermissionStatus =
    | "unavailable"
    | "denied"
    | "limited"
    | "granted"
    | "blocked";

  export function check(permission: Permission): Promise<PermissionStatus>;
  export function request(permission: Permission): Promise<PermissionStatus>;
  export function openSettings(): Promise<void>;
}

declare module "react-native" {
  export const Platform: {
    OS: "ios" | "android";
    Version: number;
  };
}
