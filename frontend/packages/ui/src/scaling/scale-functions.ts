import type { ScaleFunctions } from "./scaling-types";

const BASE_DESIGN_WIDTH = 375;

function roundToPixel(value: number): number {
  if (value < 3) return value;
  return Math.round(value * 2) / 2;
}

export function createScaleFunctions(screenWidth: number): ScaleFunctions {
  const ratio = screenWidth / BASE_DESIGN_WIDTH;

  return {
    scaleSize: (size: number) => roundToPixel(size * ratio),
    scaleFont: (size: number) => roundToPixel(size * ratio),
    scaleRadius: (size: number) => roundToPixel(size * ratio),
  };
}
