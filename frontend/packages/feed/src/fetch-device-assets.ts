import { fetchAssets } from "@ion/media-acquisition";
import type { FetchAssetsOptions, FetchAssetsResult } from "./types";

export async function fetchDeviceAssets(options: FetchAssetsOptions): Promise<FetchAssetsResult> {
  return fetchAssets(options);
}
