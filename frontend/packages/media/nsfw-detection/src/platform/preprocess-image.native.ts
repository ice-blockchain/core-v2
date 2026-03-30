import { decode as decodeJpeg } from 'jpeg-js';
import type { PreprocessedImage } from '../types';

const MODEL_INPUT_SIZE = 224;

export async function preprocessImagePlatform(
  uri: string,
): Promise<PreprocessedImage> {
  const rgbData = await fetchAndDecode(uri);
  return {
    data: rgbData,
    width: MODEL_INPUT_SIZE,
    height: MODEL_INPUT_SIZE,
    channels: 3,
  };
}

async function fetchAndDecode(uri: string): Promise<Float32Array> {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const { data, width, height } = decodeJpeg(bytes, { useTArray: true });
  const resized = resizeRgba({ src: data, srcW: width, srcH: height });
  return rgbaToNormalizedRgb(resized, MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
}

interface ResizeInput {
  src: Uint8Array;
  srcW: number;
  srcH: number;
}

function resizeRgba(input: ResizeInput): Uint8Array {
  const { src, srcW, srcH } = input;
  const dst = new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 4);
  const xRatio = srcW / MODEL_INPUT_SIZE;
  const yRatio = srcH / MODEL_INPUT_SIZE;

  for (let y = 0; y < MODEL_INPUT_SIZE; y++) {
    const srcYf = y * yRatio;
    const y0 = Math.floor(srcYf);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const dy = srcYf - y0;
    interpolateRow({ src, dst, srcW, y, y0, y1, dy, xRatio });
  }
  return dst;
}

interface RowInput {
  src: Uint8Array;
  dst: Uint8Array;
  srcW: number;
  y: number;
  y0: number;
  y1: number;
  dy: number;
  xRatio: number;
}

function interpolateRow(row: RowInput): void {
  const { src, dst, srcW, y, y0, y1, dy, xRatio } = row;
  for (let x = 0; x < MODEL_INPUT_SIZE; x++) {
    const srcXf = x * xRatio;
    const x0 = Math.floor(srcXf);
    const x1 = Math.min(x0 + 1, srcW - 1);
    const dx = srcXf - x0;

    const dstIdx = (y * MODEL_INPUT_SIZE + x) * 4;
    const i00 = (y0 * srcW + x0) * 4;
    const i10 = (y0 * srcW + x1) * 4;
    const i01 = (y1 * srcW + x0) * 4;
    const i11 = (y1 * srcW + x1) * 4;

    for (let c = 0; c < 4; c++) {
      const top = lerp(src[i00 + c] ?? 0, src[i10 + c] ?? 0, dx);
      const bot = lerp(src[i01 + c] ?? 0, src[i11 + c] ?? 0, dx);
      dst[dstIdx + c] = Math.round(lerp(top, bot, dy));
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbaToNormalizedRgb(
  rgba: Uint8Array,
  pixelCount: number,
): Float32Array {
  const rgb = new Float32Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const srcOffset = i * 4;
    rgb[i * 3] = (rgba[srcOffset] ?? 0) / 255;
    rgb[i * 3 + 1] = (rgba[srcOffset + 1] ?? 0) / 255;
    rgb[i * 3 + 2] = (rgba[srcOffset + 2] ?? 0) / 255;
  }
  return rgb;
}
