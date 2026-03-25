import type { CropRegion } from "../types";

export function assertValidCropRegion(region: CropRegion): void {
  if (region.x < 0 || region.y < 0) {
    throw new Error("Crop region coordinates must be non-negative");
  }
  if (region.width <= 0 || region.height <= 0) {
    throw new Error("Crop region dimensions must be positive");
  }
}

export function clampQuality(quality: number, min: number, max: number): number {
  if (!Number.isFinite(quality)) return min;
  return Math.max(min, Math.min(max, quality));
}
