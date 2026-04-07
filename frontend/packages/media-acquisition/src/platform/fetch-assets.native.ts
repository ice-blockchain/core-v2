import * as MediaLibrary from "expo-media-library";
import type { FetchAssetsOptions, FetchAssetsResult, DeviceAsset } from "../types";

function toDeviceAsset(asset: MediaLibrary.MediaLibraryAsset): DeviceAsset {
  const result: DeviceAsset = {
    id: asset.id,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mediaType: asset.mediaType === "video" ? "video" : "photo",
    creationTime: asset.creationTime,
  };
  if (asset.duration > 0) result.duration = Math.round(asset.duration * 1000);
  return result;
}

export async function fetchAssets(options: FetchAssetsOptions): Promise<FetchAssetsResult> {
  const query: MediaLibrary.AssetsOptions = {
    first: options.first,
    mediaType: ["photo", "video"],
    sortBy: ["creationTime"],
  };
  if (options.after) query.after = options.after;
  if (options.albumId) query.album = options.albumId;

  const page = await MediaLibrary.getAssetsAsync(query);

  return {
    assets: page.assets.map(toDeviceAsset),
    endCursor: page.endCursor,
    hasNextPage: page.hasNextPage,
  };
}
