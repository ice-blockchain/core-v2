declare module "expo-image-picker" {
  export enum MediaTypeOptions {
    All = "All",
    Images = "Images",
    Videos = "Videos",
  }

  export interface ImagePickerAsset {
    uri: string;
    mimeType?: string;
    fileSize?: number;
    width: number;
    height: number;
    duration?: number;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }

  export interface ImagePickerOptions {
    mediaTypes?: MediaTypeOptions;
    allowsMultipleSelection?: boolean;
    videoMaxDuration?: number | undefined;
    quality?: number;
  }

  export function launchImageLibraryAsync(
    options?: ImagePickerOptions,
  ): Promise<ImagePickerResult>;

  export function launchCameraAsync(
    options?: ImagePickerOptions,
  ): Promise<ImagePickerResult>;
}

declare module "expo-media-library" {
  export interface AssetInfo {
    filename: string;
    creationTime?: number;
    location?: { latitude: number; longitude: number };
    orientation?: number;
  }

  export interface MediaLibraryAsset {
    id: string;
    uri: string;
    filename: string;
    mediaType: "photo" | "video" | "audio" | "unknown";
    width: number;
    height: number;
    duration: number;
    creationTime: number;
    modificationTime: number;
  }

  export interface MediaLibraryAlbum {
    id: string;
    title: string;
    assetCount: number;
  }

  export interface AssetsOptions {
    first: number;
    after?: string;
    album?: string;
    mediaType?: Array<"photo" | "video" | "audio" | "unknown">;
    sortBy?: string[];
  }

  export interface PagedInfo {
    assets: MediaLibraryAsset[];
    endCursor: string;
    hasNextPage: boolean;
    totalCount: number;
  }

  export function getAssetInfoAsync(uri: string): Promise<AssetInfo>;
  export function getAlbumsAsync(): Promise<MediaLibraryAlbum[]>;
  export function getAssetsAsync(options: AssetsOptions): Promise<PagedInfo>;
}
