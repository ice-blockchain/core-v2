export type MediaType = "images" | "videos" | "all";

export interface MediaPickerOptions {
  allowsMultiple?: boolean;
  mediaTypes?: MediaType[];
  videoMaxDuration?: number;
}

export interface CapturedMedia {
  uri: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  duration?: number;
}

export interface MediaMetadata {
  filename?: string;
  creationDate?: Date;
  location?: { latitude: number; longitude: number };
  orientation?: 0 | 90 | 180 | 270;
}

export interface Album {
  id: string;
  title: string;
  assetCount: number;
}

export interface DeviceAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  duration?: number;
  mediaType: "photo" | "video";
  creationTime: number;
}

export interface FetchAssetsOptions {
  albumId?: string;
  first: number;
  after?: string;
}

export interface FetchAssetsResult {
  assets: DeviceAsset[];
  endCursor?: string;
  hasNextPage: boolean;
}
