import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";
import type { CoinTabKey } from "../types";

const TAB_INDICES: Record<CoinTabKey, number> = { coins: 0, nfts: 1 };

export function useTabPager(onTabChange: (tab: CoinTabKey) => void) {
  const scrollRef = useRef<ScrollView>(null);
  const pageWidth = useRef(0);

  const onLayout = useCallback((width: number) => {
    pageWidth.current = width;
  }, []);

  const scrollToTab = useCallback((tab: CoinTabKey) => {
    scrollRef.current?.scrollTo({
      x: TAB_INDICES[tab] * pageWidth.current,
      animated: true,
    });
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth.current === 0) return;
      const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth.current);
      const tab: CoinTabKey = index === 0 ? "coins" : "nfts";
      onTabChange(tab);
    },
    [onTabChange],
  );

  return { scrollRef, scrollToTab, onScrollEnd, onLayout };
}
