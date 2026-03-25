import { useEffect, useMemo, useState } from "react";
import type { ViewStyle } from "react-native";

function useKeyboardInset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const height = Math.max(0, window.innerHeight - viewport.height);
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
