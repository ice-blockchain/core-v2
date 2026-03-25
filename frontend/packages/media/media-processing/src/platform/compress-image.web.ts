import { encode } from "blurhash";
import type { ProcessingOptions, ProcessedMedia } from "../types";
import { clampQuality } from "./validate-options";

const DEFAULT_QUALITY = 0.8;
const BLURHASH_SIZE = 32;
const BLURHASH_COMPONENTS_X = 4;
const BLURHASH_COMPONENTS_Y = 3;

export async function compressImage(
  uri: string,
  options?: ProcessingOptions,
): Promise<ProcessedMedia> {
  const image = await loadImage(uri);
  const { width, height } = computeDimensions(image, options);
  const canvas = drawToCanvas(image, width, height);
  const mimeType = resolveMimeType(options?.format);
  const quality = clampQuality(options?.quality ?? DEFAULT_QUALITY, 0, 1);
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const blurhash = encodeBlurhash(canvas);
  return {
    uri: URL.createObjectURL(blob),
    mimeType,
    fileSize: blob.size,
    width,
    height,
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

function computeDimensions(
  image: HTMLImageElement,
  options?: ProcessingOptions,
): { width: number; height: number } {
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const maxWidth = options?.maxWidth;
  const maxHeight = options?.maxHeight;

  if (maxWidth && width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }
  if (maxHeight && height > maxHeight) {
    width = Math.round(width * (maxHeight / height));
    height = maxHeight;
  }
  return { width, height };
}

function drawToCanvas(
  image: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create canvas context");
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function resolveMimeType(format?: string): string {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to compress image"));
      },
      mimeType,
      quality,
    );
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
  return encodePixelsToBlurhash(
    pixels.data,
    BLURHASH_SIZE,
    BLURHASH_SIZE,
    BLURHASH_COMPONENTS_X,
    BLURHASH_COMPONENTS_Y,
  );
}

function encodePixelsToBlurhash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  componentX: number,
  componentY: number,
): string {
  return encode(pixels, width, height, componentX, componentY);
}
