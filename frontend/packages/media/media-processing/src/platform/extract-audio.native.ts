import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";
import type { AudioProcessingOptions, ProcessedMedia } from "../types";
import { getFileSize } from "./get-file-size.native";
import { assertFinitePositive } from "./validate-options";
import { assertSafeUri } from "./validate-uri";

export async function extractAudio(
  uri: string,
  options?: AudioProcessingOptions,
): Promise<ProcessedMedia> {
  assertSafeUri(uri);
  const outputUri = buildOutputUri(uri);
  const command = buildFfmpegCommand(uri, outputUri, options);
  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    throw new Error("Audio extraction failed");
  }

  const fileSize = await getFileSize(outputUri);
  return {
    uri: outputUri,
    mimeType: "audio/ogg; codecs=opus",
    fileSize,
    width: 0,
    height: 0,
    blurhash: "",
  };
}

function buildOutputUri(inputUri: string): string {
  const base = inputUri.replace(/\.[^.]+$/, "");
  return `${base}_audio.ogg`;
}

function buildFfmpegCommand(
  inputUri: string,
  outputUri: string,
  options?: AudioProcessingOptions,
): string {
  const bitrate = options?.bitrate ?? 128000;
  const sampleRate = options?.sampleRate ?? 48000;
  assertFinitePositive(bitrate, "bitrate");
  assertFinitePositive(sampleRate, "sampleRate");
  return [
    `-i "${inputUri}"`,
    "-vn",
    "-c:a libopus",
    `-b:a ${bitrate}`,
    `-ar ${sampleRate}`,
    `-y "${outputUri}"`,
  ].join(" ");
}
