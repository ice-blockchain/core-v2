import { useCallback, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { useTheme } from "@ion/ui";
import type { CoinTabKey } from "../types";
import { CoinsTabs } from "./CoinsTabs";
import { CoinSearchBar } from "./CoinSearchBar";
import { ManageCoinsButton } from "./ManageCoinsButton";
import { EmptyCoinsState } from "./EmptyCoinsState";
import { EmptyNftsState } from "./EmptyNftsState";
import { useTabPager } from "./use-tab-pager";
import { useCoinsSectionStyles } from "./use-coins-section-styles";
import { useCoinsSectionSearch } from "./use-coins-section-search";

export function CoinsSection() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<CoinTabKey>("coins");
  const [pageWidth, setPageWidth] = useState(0);
  const { scrollRef, scrollToTab, onScrollEnd, onScroll, onLayout } = useTabPager(setActiveTab);
  const search = useCoinsSectionSearch();
  const s = useCoinsSectionStyles(pageWidth);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setPageWidth(e.nativeEvent.layout.width);
    onLayout(e.nativeEvent.layout.width);
  }, [onLayout]);

  return (
    <View style={s.container}>
      <CoinsTabs activeTab={activeTab} onTabChange={scrollToTab} onSearchPress={search.activate} />
      {search.isActive && <CoinSearchBar value={search.query} onChangeText={search.setQuery} onCancel={search.cancel} />}
      <ScrollView
        ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd} onScroll={Platform.OS === "web" ? onScroll : undefined}
        onLayout={handleLayout} scrollEventThrottle={16}
      >
        <View style={s.page}>
          <EmptyCoinsState imageStyle={s.emptyImage} stateStyle={s.emptyState} textColor={colors.tertiaryText} />
          <ManageCoinsButton />
        </View>
        <View style={s.page}><EmptyNftsState /></View>
      </ScrollView>
    </View>
  );
}
