import { fetchAlbums } from "@ion/media-acquisition";
import type { Album } from "./types";

export async function fetchDeviceAlbums(): Promise<Album[]> {
  return fetchAlbums();
}
