import type { ScreenDimensions, SafeAreaInsets } from "./types";

export function getScreenDimensions(): ScreenDimensions {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio,
  };
}

function parseCssEnv(name: string): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseFloat(value) || 0;
}

export function getSafeAreaInsets(): SafeAreaInsets {
  return {
    top: parseCssEnv("env(safe-area-inset-top)"),
    bottom: parseCssEnv("env(safe-area-inset-bottom)"),
    left: parseCssEnv("env(safe-area-inset-left)"),
    right: parseCssEnv("env(safe-area-inset-right)"),
  };
}
