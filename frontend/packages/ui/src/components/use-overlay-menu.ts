import { useCallback, useRef, useState } from "react";
import type { View } from "react-native";

export function useOverlayMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, anchorRef, open, close, toggle };
}
