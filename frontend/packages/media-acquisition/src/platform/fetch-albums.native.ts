import * as MediaLibrary from "expo-media-library";
import type { Album } from "../types";

export async function fetchAlbums(): Promise<Album[]> {
  const albums = await MediaLibrary.getAlbumsAsync();

  return albums.map((album) => ({
    id: album.id,
    title: album.title,
    assetCount: album.assetCount,
  }));
}
