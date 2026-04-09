export type PermissionFlowResult =
  | "granted"
  | "denied"
  | "permanently_denied"
  | "limited";

export interface DeviceAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  duration?: number | undefined;
  mediaType: "photo" | "video";
  creationTime: number;
}
