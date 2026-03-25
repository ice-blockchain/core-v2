import { Video } from "react-native-video-compressor";
import type { VideoProcessingOptions, ProcessedMedia } from "../types";
import { generateBlurhash } from "./generate-blurhash.native";

export async function compressVideo(
  uri: string,
  options?: VideoProcessingOptions,
): Promise<ProcessedMedia> {
  const compressOptions = buildCompressOptions(options);
  const resultUri = await Video.compress(uri, compressOptions);
  const blurhash = await generateBlurhash(resultUri);
  return {
    uri: resultUri,
    mimeType: "video/mp4",
    fileSize: 0,
    width: options?.maxWidth ?? 0,
    height: options?.maxHeight ?? 0,
    blurhash,
  };
}

function buildCompressOptions(
  options?: VideoProcessingOptions,
): { maxSize?: number; bitrate?: number } {
  const compressOptions: { maxSize?: number; bitrate?: number } = {};
  if (options?.maxWidth) compressOptions.maxSize = options.maxWidth;
  if (options?.bitrate) compressOptions.bitrate = options.bitrate;
  return compressOptions;
}
