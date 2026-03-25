import { encode } from "blurhash";
import type { CropRegion, ProcessedMedia } from "../types";
import { assertValidCropRegion } from "./validate-options";

const BLURHASH_SIZE = 32;

export async function cropImage(
  uri: string,
  region: CropRegion,
): Promise<ProcessedMedia> {
  assertValidCropRegion(region);
  const image = await loadImage(uri);
  const canvas = cropToCanvas(image, region);
  const blob = await canvasToBlob(canvas);
  const blurhash = encodeBlurhash(canvas);
  return {
    uri: URL.createObjectURL(blob),
    mimeType: "image/png",
    fileSize: blob.size,
    width: region.width,
    height: region.height,
    blurhash,
  };
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = uri;
  });
}

function cropToCanvas(
  image: HTMLImageElement,
  region: CropRegion,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = region.width;
  canvas.height = region.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create canvas context");
  context.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to crop image"));
    }, "image/png");
  });
}

function encodeBlurhash(canvas: HTMLCanvasElement): string {
  const small = document.createElement("canvas");
  small.width = BLURHASH_SIZE;
  small.height = BLURHASH_SIZE;
  const context = small.getContext("2d");
  if (!context) return "";
  context.drawImage(canvas, 0, 0, BLURHASH_SIZE, BLURHASH_SIZE);
  const pixels = context.getImageData(0, 0, BLURHASH_SIZE, BLURHASH_SIZE);
  return encode(pixels.data, BLURHASH_SIZE, BLURHASH_SIZE, 4, 3);
}
