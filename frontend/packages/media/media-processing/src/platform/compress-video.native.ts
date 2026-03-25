import { FFprobeKit } from "ffmpeg-kit-react-native";
import { Video } from "react-native-video-compressor";
import type { VideoProcessingOptions, ProcessedMedia } from "../types";
import { generateBlurhash } from "./generate-blurhash.native";
import { getFileSize } from "./get-file-size.native";

export async function compressVideo(
  uri: string,
  options?: VideoProcessingOptions,
): Promise<ProcessedMedia> {
  const compressOptions = buildCompressOptions(options);
  const resultUri = await Video.compress(uri, compressOptions);
  const [blurhash, fileSize, dimensions] = await Promise.all([
    generateBlurhash(resultUri),
    getFileSize(resultUri),
    probeVideoDimensions(resultUri),
  ]);
  return {
    uri: resultUri,
    mimeType: "video/mp4",
    fileSize,
    width: dimensions.width,
    height: dimensions.height,
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

async function probeVideoDimensions(
  uri: string,
): Promise<{ width: number; height: number }> {
  const session = await FFprobeKit.getMediaInformation(uri);
  const info = session.getMediaInformation();
  const stream = info?.getStreams()?.[0];
  if (!stream) return { width: 0, height: 0 };
  return { width: stream.getWidth(), height: stream.getHeight() };
}
