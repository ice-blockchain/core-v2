import { encode } from "blurhash";
import * as ImageManipulator from "expo-image-manipulator";
import { decodeBase64Pixels } from "./decode-base64-pixels";

const BLURHASH_SIZE = 32;

export async function generateBlurhash(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: BLURHASH_SIZE, height: BLURHASH_SIZE } }],
    { base64: true, format: "png" },
  );
  if (!result.base64) return "";
  const pixels = decodeBase64Pixels(result.base64, BLURHASH_SIZE);
  return encode(pixels, BLURHASH_SIZE, BLURHASH_SIZE, 4, 3);
}
