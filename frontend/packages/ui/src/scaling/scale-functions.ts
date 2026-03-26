import type { ScaleFunctions } from "./scaling-types";

const BASE_DESIGN_WIDTH = 375;

/** @deprecated Use `rem()` from `@ion/ui` instead. */
function roundToPixel(value: number): number {
  return Math.round(value * 2) / 2;
}

/** @deprecated Use `rem()` from `@ion/ui` instead. */
export function createScaleFunctions(screenWidth: number): ScaleFunctions {
  const ratio = screenWidth / BASE_DESIGN_WIDTH;

  return {
    scaleSize: (size: number) => roundToPixel(size * ratio),
    scaleFont: (size: number) => roundToPixel(size * ratio),
    scaleRadius: (size: number) => roundToPixel(size * ratio),
  };
}
