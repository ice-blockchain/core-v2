import type { PreprocessedImage } from '../types';

const MODEL_INPUT_SIZE = 224;

export async function preprocessImagePlatform(
  uri: string,
): Promise<PreprocessedImage> {
  const image = await loadImage(uri);
  const pixels = extractPixels(image);
  return {
    data: pixels,
    width: MODEL_INPUT_SIZE,
    height: MODEL_INPUT_SIZE,
    channels: 3,
  };
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${uri}`));
    img.src = uri;
  });
}

function extractPixels(image: HTMLImageElement): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(image, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  return rgbaToNormalizedRgb(data);
}

function rgbaToNormalizedRgb(rgba: Uint8ClampedArray): Float32Array {
  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const rgb = new Float32Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const srcOffset = i * 4;
    rgb[i * 3] = (rgba[srcOffset] ?? 0) / 255;
    rgb[i * 3 + 1] = (rgba[srcOffset + 1] ?? 0) / 255;
    rgb[i * 3 + 2] = (rgba[srcOffset + 2] ?? 0) / 255;
  }
  return rgb;
}
