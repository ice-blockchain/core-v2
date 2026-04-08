import { useCallback, useRef } from "react";
import { useSharedValue } from "react-native-reanimated";
import type PagerView from "react-native-pager-view";
import type { TabViewState } from "./animated-tab-view-types";

export function useTabViewState(): TabViewState {
  const position = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const pagerRef = useRef<PagerView | null>(null);

  const setPage = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
  }, []);

  return { position, currentIndex, pagerRef, setPage };
}
