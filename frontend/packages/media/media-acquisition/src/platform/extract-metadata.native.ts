import * as MediaLibrary from "expo-media-library";
import type { MediaMetadata } from "../types";

export async function extractMetadata(
  uri: string,
): Promise<MediaMetadata> {
  const asset = await MediaLibrary.getAssetInfoAsync(uri);
  return mapAssetToMetadata(asset);
}

function mapAssetToMetadata(
  asset: MediaLibrary.AssetInfo,
): MediaMetadata {
  const metadata: MediaMetadata = { filename: asset.filename };
  if (asset.creationTime) {
    metadata.creationDate = new Date(asset.creationTime);
  }
  if (asset.location) {
    metadata.location = mapLocation(asset.location);
  }
  const orientation = mapOrientation(asset.orientation);
  if (orientation !== undefined) {
    metadata.orientation = orientation;
  }
  return metadata;
}

function mapLocation(
  location: { latitude: number; longitude: number },
): NonNullable<MediaMetadata["location"]> {
  return { latitude: location.latitude, longitude: location.longitude };
}

function mapOrientation(
  orientation?: number,
): MediaMetadata["orientation"] {
  const valid = [0, 90, 180, 270] as const;
  if (orientation === undefined) return undefined;
  const match = valid.find((v) => v === orientation);
  return match;
}
