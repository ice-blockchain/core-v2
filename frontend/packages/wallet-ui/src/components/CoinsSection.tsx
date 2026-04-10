import { useCallback, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { useTheme } from "@ion/ui";
import { useActiveWalletView } from "@ion/wallet";
import type { CoinTabKey } from "../types";
import { CoinsTabs } from "./CoinsTabs";
import { CoinSearchBar } from "./CoinSearchBar";
import { EmptyNftsState } from "./EmptyNftsState";
import { useTabPager } from "./use-tab-pager";
import { useCoinsSectionStyles } from "./use-coins-section-styles";
import { useCoinsSectionSearch } from "./use-coins-section-search";
import { CoinsSectionCoinsPage } from "./CoinsSectionCoinsPage";

interface CoinsSectionProps {
  readonly isBalanceVisible: boolean;
}

export function CoinsSection({ isBalanceVisible }: CoinsSectionProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<CoinTabKey>("coins");
  const [pageWidth, setPageWidth] = useState(0);
  const pager = useTabPager(setActiveTab);
  const search = useCoinsSectionSearch();
  const s = useCoinsSectionStyles(pageWidth);
  const activeView = useActiveWalletView();
  const handleLayout = useCallback((e: LayoutChangeEvent) => { setPageWidth(e.nativeEvent.layout.width); pager.onLayout(e.nativeEvent.layout.width); }, [pager]);

  return (
    <View style={s.container}>
      <CoinsTabs activeTab={activeTab} onTabChange={pager.scrollToTab} onSearchPress={search.activate} />
      {search.isActive && <CoinSearchBar value={search.query} onChangeText={search.setQuery} onCancel={search.cancel} />}
      <ScrollView
        ref={pager.scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={pager.onScrollEnd} onScroll={Platform.OS === "web" ? pager.onScroll : undefined}
        onLayout={handleLayout} scrollEventThrottle={16}
      >
        <CoinsSectionCoinsPage
          activeView={activeView} searchQuery={search.query}
          isBalanceVisible={isBalanceVisible}
          styles={s} textColor={colors.tertiaryText}
        />
        <View style={s.page}><EmptyNftsState /></View>
      </ScrollView>
    </View>
  );
}
