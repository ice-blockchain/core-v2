import { assertSafeUri } from "./validate-uri";

const LOAD_TIMEOUT_MS = 30_000;

export function getImageDimensions(
  uri: string,
): Promise<{ width: number; height: number }> {
  assertSafeUri(uri);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Image load timed out")),
      LOAD_TIMEOUT_MS,
    );
    const image = new Image();
    image.onload = () => {
      clearTimeout(timer);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Failed to load image"));
    };
    image.src = uri;
  });
}
