import * as ImageManipulator from "expo-image-manipulator";
import type { CropRegion, ProcessedMedia } from "../types";
import { generateBlurhash } from "./generate-blurhash.native";
import { getFileSize } from "./get-file-size.native";
import { assertValidCropRegion } from "./validate-options";
import { assertSafeUri } from "./validate-uri";

export async function cropImage(
  uri: string,
  region: CropRegion,
): Promise<ProcessedMedia> {
  assertSafeUri(uri);
  assertValidCropRegion(region);
  const result = await ImageManipulator.manipulateAsync(uri, [
    {
      crop: {
        originX: region.x,
        originY: region.y,
        width: region.width,
        height: region.height,
      },
    },
  ]);
  const [blurhash, fileSize] = await Promise.all([
    generateBlurhash(result.uri),
    getFileSize(result.uri),
  ]);
  return {
    uri: result.uri,
    mimeType: "image/png",
    fileSize,
    width: result.width,
    height: result.height,
    blurhash,
  };
}
