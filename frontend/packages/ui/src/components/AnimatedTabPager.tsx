import { forwardRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeSyntheticEvent } from "react-native";
import PagerView from "react-native-pager-view";
import type {
  PagerViewOnPageScrollEventData,
  PagerViewOnPageSelectedEventData,
} from "react-native-pager-view";
import type { AnimatedTabPagerProps } from "./animated-tab-view-types";

export const AnimatedTabPager = forwardRef<PagerView, AnimatedTabPagerProps>(
  function AnimatedTabPager({ children, position, onPageSelected, style }, ref) {
    const handlePageScroll = useCallback(
      (event: NativeSyntheticEvent<PagerViewOnPageScrollEventData>) => {
        const { position: page, offset } = event.nativeEvent;
        position.value = page + offset;
      },
      [position],
    );

    const handlePageSelected = useCallback(
      (event: NativeSyntheticEvent<PagerViewOnPageSelectedEventData>) => {
        onPageSelected?.(event.nativeEvent.position);
      },
      [onPageSelected],
    );

    return (
      <PagerView
        ref={ref}
        style={[styles.pager, style]}
        initialPage={0}
        onPageScroll={handlePageScroll}
        onPageSelected={handlePageSelected}
      >
        {children.map((child, index) => (
          <View key={index} style={styles.page}>
            {child}
          </View>
        ))}
      </PagerView>
    );
  },
);

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1 },
});
