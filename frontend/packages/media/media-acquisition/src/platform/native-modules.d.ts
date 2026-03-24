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

  export function getAssetInfoAsync(uri: string): Promise<AssetInfo>;
}
