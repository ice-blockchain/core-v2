export type PermissionFlowResult =
  | "granted"
  | "denied"
  | "permanently_denied"
  | "limited";

export type { CapturedMedia, Album, DeviceAsset, FetchAssetsOptions, FetchAssetsResult } from "@ion/media-acquisition";
