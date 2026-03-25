import * as ImageManipulator from "expo-image-manipulator";
import type { CropRegion, ProcessedMedia } from "../types";
import { generateBlurhash } from "./generate-blurhash.native";

export async function cropImage(
  uri: string,
  region: CropRegion,
): Promise<ProcessedMedia> {
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
  const blurhash = await generateBlurhash(result.uri);
  return {
    uri: result.uri,
    mimeType: "image/png",
    fileSize: 0,
    width: result.width,
    height: result.height,
    blurhash,
  };
}
