import type { FetchAssetsOptions, FetchAssetsResult } from "../types";

export async function fetchAssets(_options: FetchAssetsOptions): Promise<FetchAssetsResult> {
  return { assets: [], hasNextPage: false };
}
