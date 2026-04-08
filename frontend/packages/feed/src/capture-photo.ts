import { launchCamera } from "react-native-image-picker";
import type { DeviceAsset } from "./types";

export function capturePhoto(): Promise<DeviceAsset | null> {
  return new Promise((resolve) => {
    launchCamera({ mediaType: "photo" }, (response) => {
      if (response.didCancel || !response.assets?.length) {
        resolve(null);
        return;
      }
      const asset = response.assets[0]!;
      if (!asset.uri) { resolve(null); return; }
      resolve({
        id: asset.uri,
        uri: asset.uri,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
        mediaType: "photo",
        creationTime: Date.now(),
      });
    });
  });
}
