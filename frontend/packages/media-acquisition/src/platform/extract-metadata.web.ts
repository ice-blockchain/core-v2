import type { MediaMetadata } from "../types";

export async function extractMetadata(uri: string): Promise<MediaMetadata> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = extractFilename(uri);

  if (blob.type.startsWith("video/")) {
    return extractVideoMetadata(uri, filename);
  }
  return extractImageMetadata(uri, filename);
}

function extractFilename(uri: string): string | undefined {
  try {
    const url = new URL(uri);
    const path = url.pathname;
    const name = path.split("/").pop();
    return name || undefined;
  } catch {
    return undefined;
  }
}

function buildMetadata(filename: string | undefined): MediaMetadata {
  const metadata: MediaMetadata = {};
  if (filename) metadata.filename = filename;
  return metadata;
}

function extractImageMetadata(
  uri: string,
  filename: string | undefined,
): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(buildMetadata(filename));
    image.onerror = () => reject(new Error("Failed to load image metadata"));
    image.src = uri;
  });
}

function extractVideoMetadata(
  uri: string,
  filename: string | undefined,
): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(buildMetadata(filename));
    video.onerror = () => reject(new Error("Failed to load video metadata"));
    video.src = uri;
  });
}
