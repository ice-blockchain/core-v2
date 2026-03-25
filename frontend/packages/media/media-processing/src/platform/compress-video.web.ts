import { encode } from "blurhash";
import type { VideoProcessingOptions, ProcessedMedia } from "../types";

const BLURHASH_CANVAS_SIZE = 32;

export async function compressVideo(
  uri: string,
  options?: VideoProcessingOptions,
): Promise<ProcessedMedia> {
  const video = await loadVideo(uri);
  const { width, height } = computeDimensions(video, options);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create canvas context");
  context.drawImage(video, 0, 0, width, height);
  const blurhash = extractBlurhashFromCanvas(canvas);
  const blob = await fetchAsBlob(uri);
  return {
    uri,
    mimeType: "video/mp4",
    fileSize: blob.size,
    width,
    height,
    blurhash,
  };
}

function loadVideo(uri: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = uri;
  });
}

function computeDimensions(
  video: HTMLVideoElement,
  options?: VideoProcessingOptions,
): { width: number; height: number } {
  let width = video.videoWidth;
  let height = video.videoHeight;
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

const FETCH_TIMEOUT_MS = 30_000;

async function fetchAsBlob(uri: string): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(uri, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    return response.blob();
  } finally {
    clearTimeout(timeout);
  }
}

function extractBlurhashFromCanvas(
  canvas: HTMLCanvasElement,
): string {
  const small = document.createElement("canvas");
  small.width = BLURHASH_CANVAS_SIZE;
  small.height = BLURHASH_CANVAS_SIZE;
  const context = small.getContext("2d");
  if (!context) return "";
  context.drawImage(canvas, 0, 0, BLURHASH_CANVAS_SIZE, BLURHASH_CANVAS_SIZE);
  const pixels = context.getImageData(
    0, 0, BLURHASH_CANVAS_SIZE, BLURHASH_CANVAS_SIZE,
  );
  return encode(pixels.data, BLURHASH_CANVAS_SIZE, BLURHASH_CANVAS_SIZE, 4, 3);
}
