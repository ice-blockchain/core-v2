import type { DeviceAsset } from "../types";

const MAX_SELECTION = 10;
const MILLISECONDS_PER_SECOND = 1000;

function resolveMediaFile(file: File): Promise<DeviceAsset> {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");
  return isVideo ? resolveVideoAsset(url) : resolveImageAsset(url);
}

function resolveImageAsset(url: string): Promise<DeviceAsset> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ id: url, uri: url, width: image.naturalWidth, height: image.naturalHeight, mediaType: "photo", creationTime: Date.now() });
    image.onerror = () => resolve({ id: url, uri: url, width: 0, height: 0, mediaType: "photo", creationTime: Date.now() });
    image.src = url;
  });
}

function resolveVideoAsset(url: string): Promise<DeviceAsset> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration * MILLISECONDS_PER_SECOND) : undefined;
      resolve({ id: url, uri: url, width: video.videoWidth, height: video.videoHeight, duration, mediaType: "video", creationTime: Date.now() });
    };
    video.onerror = () => resolve({ id: url, uri: url, width: 0, height: 0, mediaType: "video", creationTime: Date.now() });
    video.src = url;
  });
}

export async function pickMediaFromGallery(): Promise<DeviceAsset[]> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*";
  input.multiple = true;

  const files = await waitForFiles(input);
  const selected = files.slice(0, MAX_SELECTION);
  return Promise.all(selected.map(resolveMediaFile));
}

function waitForFiles(input: HTMLInputElement): Promise<File[]> {
  return new Promise((resolve) => {
    const cleanup = () => {
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
    };
    const handleChange = () => { cleanup(); resolve(input.files ? Array.from(input.files) : []); };
    const handleCancel = () => { cleanup(); resolve([]); };
    input.addEventListener("change", handleChange);
    input.addEventListener("cancel", handleCancel);
    input.click();
  });
}
