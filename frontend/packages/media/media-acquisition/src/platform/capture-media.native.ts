import * as ImagePicker from "expo-image-picker";
import type { MediaPickerOptions, CapturedMedia } from "../types";

export async function captureMedia(
  options?: MediaPickerOptions,
): Promise<CapturedMedia> {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: resolveMediaTypes(options?.mediaTypes),
    videoMaxDuration: options?.videoMaxDuration,
    quality: 1,
  });

  if (result.canceled) {
    throw new Error("Camera capture was canceled");
  }

  const asset = result.assets[0]!;
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

function resolveMediaTypes(
  types?: MediaPickerOptions["mediaTypes"],
): ImagePicker.MediaTypeOptions {
  if (!types || types.includes("all")) {
    return ImagePicker.MediaTypeOptions.All;
  }
  if (types.includes("videos")) return ImagePicker.MediaTypeOptions.Videos;
  return ImagePicker.MediaTypeOptions.Images;
}
