import * as ImagePicker from "expo-image-picker";
import type { MediaPickerOptions, CapturedMedia } from "../types";

function mapMediaTypes(
  types?: MediaPickerOptions["mediaTypes"],
): ImagePicker.MediaTypeOptions {
  if (!types || types.includes("all")) {
    return ImagePicker.MediaTypeOptions.All;
  }
  const hasImages = types.includes("images");
  const hasVideos = types.includes("videos");
  if (hasImages && hasVideos) return ImagePicker.MediaTypeOptions.All;
  if (hasVideos) return ImagePicker.MediaTypeOptions.Videos;
  return ImagePicker.MediaTypeOptions.Images;
}

function toMedia(asset: ImagePicker.ImagePickerAsset): CapturedMedia {
  const media: CapturedMedia = {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "application/octet-stream",
    fileSize: asset.fileSize ?? 0,
    width: asset.width,
    height: asset.height,
  };
  if (asset.duration) media.duration = Math.round(asset.duration);
  return media;
}

export async function pickMedia(
  options?: MediaPickerOptions,
): Promise<CapturedMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: mapMediaTypes(options?.mediaTypes),
    allowsMultipleSelection: options?.allowsMultiple ?? false,
    videoMaxDuration: options?.videoMaxDuration,
    quality: 1,
  });

  if (result.canceled) return [];
  return result.assets.map(toMedia);
}
