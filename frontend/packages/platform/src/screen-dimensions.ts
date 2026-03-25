import { Dimensions, Platform } from "react-native";
import type { ScreenDimensions, SafeAreaInsets } from "./types";

export function getScreenDimensions(): ScreenDimensions {
  const { width, height, scale } = Dimensions.get("screen");
  return { width, height, scale };
}

const DEFAULT_INSETS: SafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

let insets: SafeAreaInsets = { ...DEFAULT_INSETS };

export function setSafeAreaInsets(next: SafeAreaInsets): void {
  insets = next;
}

export function getSafeAreaInsets(): SafeAreaInsets {
  if (Platform.OS === "android") {
    return { ...insets, bottom: Math.max(insets.bottom, 12) };
  }
  return insets;
}
