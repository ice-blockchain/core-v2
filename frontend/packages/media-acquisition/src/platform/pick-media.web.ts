import type { MediaPickerOptions, CapturedMedia } from "../types";

function buildAcceptString(options?: MediaPickerOptions): string {
  const types = options?.mediaTypes ?? ["all"];
  if (types.includes("all")) return "image/*,video/*";

  const parts: string[] = [];
  if (types.includes("images")) parts.push("image/*");
  if (types.includes("videos")) parts.push("video/*");
  return parts.join(",");
}

function readFileAsMedia(file: File): Promise<CapturedMedia> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");

    if (isVideo) {
      resolveVideoMedia(file, url, resolve, reject);
    } else {
      resolveImageMedia(file, url, resolve, reject);
    }
  });
}

function resolveImageMedia(
  file: File,
  url: string,
  resolve: (value: CapturedMedia) => void,
  reject: (reason: Error) => void,
): void {
  const image = new Image();
  image.onload = () => {
    resolve({
      uri: url,
      mimeType: file.type,
      fileSize: file.size,
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  };
  image.onerror = () => reject(new Error("Failed to load image"));
  image.src = url;
}

function resolveVideoMedia(
  file: File,
  url: string,
  resolve: (value: CapturedMedia) => void,
  reject: (reason: Error) => void,
): void {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.onloadedmetadata = () => {
    resolve({
      uri: url,
      mimeType: file.type,
      fileSize: file.size,
      width: video.videoWidth,
      height: video.videoHeight,
      duration: Math.round(video.duration * 1000),
    });
  };
  video.onerror = () => reject(new Error("Failed to load video"));
  video.src = url;
}

export async function pickMedia(
  options?: MediaPickerOptions,
): Promise<CapturedMedia[]> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = buildAcceptString(options);
  input.multiple = options?.allowsMultiple ?? false;

  const files = await waitForFiles(input);
  return Promise.all(files.map(readFileAsMedia));
}

function waitForFiles(input: HTMLInputElement): Promise<File[]> {
  return new Promise((resolve) => {
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      resolve(files);
    };
    input.click();
  });
}
