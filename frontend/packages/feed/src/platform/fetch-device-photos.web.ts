import type { DeviceAsset } from "../types";

interface FetchPhotosOptions {
  first: number;
  after?: string | undefined;
}

interface FetchPhotosResult {
  assets: DeviceAsset[];
  endCursor?: string | undefined;
  hasNextPage: boolean;
}

export async function fetchDevicePhotos(_options: FetchPhotosOptions): Promise<FetchPhotosResult> {
  return { assets: [], hasNextPage: false };
}
