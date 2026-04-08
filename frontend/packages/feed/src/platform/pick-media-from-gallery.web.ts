import type { DeviceAsset } from "../types";

const MAX_SELECTION = 10;

function resolveMediaFile(file: File): Promise<DeviceAsset> {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");
  return isVideo ? resolveVideoAsset(file, url) : resolveImageAsset(url);
}

function resolveImageAsset(url: string): Promise<DeviceAsset> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ id: url, uri: url, width: image.naturalWidth, height: image.naturalHeight, mediaType: "photo", creationTime: Date.now() });
    image.onerror = () => resolve({ id: url, uri: url, width: 0, height: 0, mediaType: "photo", creationTime: Date.now() });
    image.src = url;
  });
}

function resolveVideoAsset(file: File, url: string): Promise<DeviceAsset> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ id: url, uri: url, width: video.videoWidth, height: video.videoHeight, duration: Math.round(video.duration * 1000), mediaType: "video", creationTime: Date.now() });
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
    input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
    input.click();
  });
}
