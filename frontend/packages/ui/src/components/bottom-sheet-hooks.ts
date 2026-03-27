import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { ViewStyle } from "react-native";

interface ViewportLike {
  height: number;
  addEventListener: (type: string, handler: () => void) => void;
  removeEventListener: (type: string, handler: () => void) => void;
}

function getVisualViewport(): ViewportLike | null {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = globalThis as any;
  return win.visualViewport ?? null;
}

function getWindowInnerHeight(): number {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).innerHeight ?? 0;
}

export function useKeyboardInset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = getVisualViewport();
    if (!viewport) return;

    const handleResize = () => {
      const height = Math.max(0, getWindowInnerHeight() - viewport.height);
      setKeyboardHeight(height);
    };

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

  return keyboardHeight;
}

export function useKeyboardContentStyle(): ViewStyle | undefined {
  const keyboardInset = useKeyboardInset();

  return useMemo(
    () => (keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined),
    [keyboardInset],
  );
}
