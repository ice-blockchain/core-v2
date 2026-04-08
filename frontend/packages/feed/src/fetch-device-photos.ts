import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import type { DeviceAsset } from "./types";

interface FetchPhotosOptions {
  first: number;
  after?: string | undefined;
}

interface FetchPhotosResult {
  assets: DeviceAsset[];
  endCursor?: string | undefined;
  hasNextPage: boolean;
}

export async function fetchDevicePhotos(options: FetchPhotosOptions): Promise<FetchPhotosResult> {
  const params: { first: number; after?: string; assetType: "All"; include: Array<"imageSize" | "playableDuration"> } = {
    first: options.first,
    assetType: "All",
    include: ["imageSize", "playableDuration"],
  };
  if (options.after) params.after = options.after;

  const result = await CameraRoll.getPhotos(params);

  const assets: DeviceAsset[] = result.edges.map((edge) => ({
    id: edge.node.image.uri,
    uri: edge.node.image.uri,
    width: edge.node.image.width,
    height: edge.node.image.height,
    duration: edge.node.image.playableDuration > 0 ? Math.round(edge.node.image.playableDuration * 1000) : undefined,
    mediaType: edge.node.type.includes("video") ? "video" as const : "photo" as const,
    creationTime: edge.node.timestamp ?? Date.now(),
  }));

  return {
    assets,
    endCursor: result.page_info.end_cursor,
    hasNextPage: result.page_info.has_next_page,
  };
}
