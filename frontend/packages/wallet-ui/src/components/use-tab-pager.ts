import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";
import type { CoinTabKey } from "../types";

const TAB_INDICES: Record<CoinTabKey, number> = { coins: 0, nfts: 1 };
const IS_WEB = Platform.OS === "web";

function resolveTab(offsetX: number, width: number): CoinTabKey {
  return Math.round(offsetX / width) === 0 ? "coins" : "nfts";
}

function getOffsetX(e: NativeSyntheticEvent<NativeScrollEvent>) {
  return e.nativeEvent.contentOffset.x;
}

export function useTabPager(onTabChange: (tab: CoinTabKey) => void) {
  const scrollRef = useRef<ScrollView>(null);
  const pageWidth = useRef(0);
  const webTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLayout = useCallback((width: number) => { pageWidth.current = width; }, []);
  const scrollToTab = useCallback((tab: CoinTabKey) => {
    if (IS_WEB) onTabChange(tab);
    scrollRef.current?.scrollTo({ x: TAB_INDICES[tab] * pageWidth.current, animated: true });
  }, [onTabChange]);
  const detectTab = useCallback(
    (offsetX: number) => {
      if (pageWidth.current === 0) return;
      onTabChange(resolveTab(offsetX, pageWidth.current));
    },
    [onTabChange],
  );
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => detectTab(getOffsetX(e)),
    [detectTab],
  );
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!IS_WEB) return;
      if (webTimer.current) clearTimeout(webTimer.current);
      webTimer.current = setTimeout(() => detectTab(getOffsetX(e)), 150);
    },
    [detectTab],
  );
  useEffect(() => {
    return () => {
      if (webTimer.current) clearTimeout(webTimer.current);
    };
  }, []);
  return { scrollRef, scrollToTab, onScrollEnd, onScroll, onLayout };
}
