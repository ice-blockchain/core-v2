import { PNG } from "pngjs";

export function decodeBase64Pixels(
  base64: string,
  size: number,
): Uint8ClampedArray {
  const binary = decodeBase64(base64);
  return extractRgbaFromPng(binary, size);
}

function decodeBase64(str: string): Buffer {
  return Buffer.from(str, "base64");
}

function extractRgbaFromPng(
  binary: Buffer,
  size: number,
): Uint8ClampedArray {
  const png = PNG.sync.read(binary);
  return new Uint8ClampedArray(png.data.buffer).slice(0, size * size * 4);
}
