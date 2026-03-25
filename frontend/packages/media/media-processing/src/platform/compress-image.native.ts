import * as ImageManipulator from "expo-image-manipulator";
import type { ProcessingOptions, ProcessedMedia } from "../types";
import { generateBlurhash } from "./generate-blurhash.native";
import { getFileSize } from "./get-file-size.native";
import { assertFinitePositive, clampQuality } from "./validate-options";
import { assertSafeUri } from "./validate-uri";

const DEFAULT_QUALITY = 0.8;

export async function compressImage(
  uri: string,
  options?: ProcessingOptions,
): Promise<ProcessedMedia> {
  assertSafeUri(uri);
  const actions = buildActions(options);
  const saveOptions = buildSaveOptions(options);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    saveOptions,
  );
  const mimeType = resolveMimeType(saveOptions.format);
  const [blurhash, fileSize] = await Promise.all([
    generateBlurhash(result.uri),
    getFileSize(result.uri),
  ]);
  return {
    uri: result.uri,
    mimeType,
    fileSize,
    width: result.width,
    height: result.height,
    blurhash,
  };
}

function buildActions(
  options?: ProcessingOptions,
): ImageManipulator.Action[] {
  if (!options?.maxWidth && !options?.maxHeight) return [];
  const resize: { width?: number; height?: number } = {};
  if (options.maxWidth) {
    assertFinitePositive(options.maxWidth, "maxWidth");
    resize.width = options.maxWidth;
  }
  if (options.maxHeight) {
    assertFinitePositive(options.maxHeight, "maxHeight");
    resize.height = options.maxHeight;
  }
  return [{ resize }];
}

function buildSaveOptions(
  options?: ProcessingOptions,
): ImageManipulator.SaveOptions {
  return {
    compress: clampQuality(options?.quality ?? DEFAULT_QUALITY, 0, 1),
    format: resolveFormat(options?.format),
  };
}

function resolveFormat(
  format?: string,
): "jpeg" | "png" | "webp" {
  if (format === "png") return "png";
  if (format === "webp") return "webp";
  return "jpeg";
}

function resolveMimeType(format?: string): string {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}
