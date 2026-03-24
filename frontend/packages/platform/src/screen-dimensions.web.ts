"use client";

import type { ScreenDimensions, SafeAreaInsets } from "./types";

export function getScreenDimensions(): ScreenDimensions {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio,
  };
}

/**
 * Returns safe area insets on web.
 *
 * CSS env() values (safe-area-inset-*) are resolved by the CSS engine during
 * layout and cannot be read via getComputedStyle. This function returns zeros.
 * Web apps should handle safe areas in CSS using env() directly, not via JS.
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}
