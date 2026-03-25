import { encode } from "blurhash";

const BLURHASH_SIZE = 32;

export async function generateBlurhash(uri: string): Promise<string> {
  const image = await loadImage(uri);
  const canvas = downscaleToCanvas(image);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create canvas context");
  const pixels = context.getImageData(0, 0, BLURHASH_SIZE, BLURHASH_SIZE);
  return encodePixelsToBlurhash(pixels.data);
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = uri;
  });
}

function downscaleToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = BLURHASH_SIZE;
  canvas.height = BLURHASH_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create canvas context");
  context.drawImage(image, 0, 0, BLURHASH_SIZE, BLURHASH_SIZE);
  return canvas;
}

function encodePixelsToBlurhash(pixels: Uint8ClampedArray): string {
  return encode(pixels, BLURHASH_SIZE, BLURHASH_SIZE, 4, 3);
}
