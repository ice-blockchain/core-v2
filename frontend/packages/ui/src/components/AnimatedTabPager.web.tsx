import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, useWindowDimensions } from "react-native";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { AnimatedTabPagerProps } from "./animated-tab-view-types";

interface WebPagerHandle {
  setPage: (index: number) => void;
  setPageWithoutAnimation: (index: number) => void;
  setScrollEnabled: (enabled: boolean) => void;
}

function buildPagerHandle(scrollRef: React.RefObject<ScrollView | null>, width: number): WebPagerHandle {
  return {
    setPage: (index: number) => scrollRef.current?.scrollTo({ x: index * width, animated: true }),
    setPageWithoutAnimation: (index: number) => scrollRef.current?.scrollTo({ x: index * width, animated: false }),
    setScrollEnabled: () => {},
  };
}

function usePageScrollHandler(position: SharedValue<number>, width: number) {
  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      position.value = event.nativeEvent.contentOffset.x / width;
    },
    [position, width],
  );
}

export const AnimatedTabPager = forwardRef<WebPagerHandle, AnimatedTabPagerProps>(
  function AnimatedTabPager({ children, position, onPageSelected }, ref) {
    const scrollRef = useRef<ScrollView | null>(null);
    const { width } = useWindowDimensions();
    const [currentPage, setCurrentPage] = useState(0);

    useImperativeHandle(ref, () => buildPagerHandle(scrollRef, width), [width]);

    const handleScroll = usePageScrollHandler(position, width);
    const handleMomentumEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const page = Math.round(event.nativeEvent.contentOffset.x / width);
        if (page !== currentPage) { setCurrentPage(page); onPageSelected?.(page); }
      },
      [width, currentPage, onPageSelected],
    );

    return (
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={handleScroll} onMomentumScrollEnd={handleMomentumEnd} scrollEventThrottle={16} style={styles.pager}>
        {children.map((child, index) => (
          <View key={index} style={[styles.page, { width }]}>{child}</View>
        ))}
      </ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1 },
});
