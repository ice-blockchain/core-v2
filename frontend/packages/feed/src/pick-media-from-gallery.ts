import { launchImageLibrary } from "react-native-image-picker";
import type { DeviceAsset } from "./types";

const MAX_SELECTION = 10;

export function pickMediaFromGallery(): Promise<DeviceAsset[]> {
  return new Promise((resolve) => {
    launchImageLibrary({ mediaType: "mixed", selectionLimit: MAX_SELECTION }, (response) => {
      if (response.didCancel || !response.assets?.length) {
        resolve([]);
        return;
      }
      const assets: DeviceAsset[] = response.assets
        .filter((asset) => asset.uri)
        .map((asset) => ({
          id: asset.uri!,
          uri: asset.uri!,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          duration: asset.duration ? Math.round(asset.duration * 1000) : undefined,
          mediaType: asset.type?.startsWith("video/") ? "video" as const : "photo" as const,
          creationTime: Date.now(),
        }));
      resolve(assets);
    });
  });
}
