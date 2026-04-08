import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";

const DIRECTION_THRESHOLD = 2;
const COOLDOWN_MS = 200;
const isWeb = Platform.OS === "web";

export function useArchiveTileVisibility() {
  const [isVisible, setIsVisible] = useState(false);
  const lastOffsetY = useRef(0);
  const lastChangeTime = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = Date.now();
    if (now - lastChangeTime.current < COOLDOWN_MS) return;
    const offsetY = e.nativeEvent.contentOffset.y;
    const rawDelta = offsetY - lastOffsetY.current;
    lastOffsetY.current = offsetY;
    const delta = isWeb ? -rawDelta : rawDelta;
    if (delta > DIRECTION_THRESHOLD) { setIsVisible(true); lastChangeTime.current = now; }
    else if (delta < -DIRECTION_THRESHOLD) { setIsVisible(false); lastChangeTime.current = now; }
  }, []);

  return { isVisible, handleScroll };
}
