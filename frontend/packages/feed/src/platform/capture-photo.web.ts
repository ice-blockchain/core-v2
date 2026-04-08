import type { DeviceAsset } from "../types";

function resolveImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}

export async function capturePhoto(): Promise<DeviceAsset | null> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";

  const file = await waitForFile(input);
  if (!file) return null;

  const uri = URL.createObjectURL(file);
  const { width, height } = await resolveImageDimensions(uri);

  return { id: uri, uri, width, height, mediaType: "photo", creationTime: Date.now() };
}

function waitForFile(input: HTMLInputElement): Promise<File | null> {
  return new Promise((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
