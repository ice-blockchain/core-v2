import { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import type { ImageStyle, LayoutChangeEvent, ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { CoinTabKey } from "../types";
import { emptyCoinsImage } from "../assets/wallet-images";
import { CoinsTabs } from "./CoinsTabs";
import { CoinSearchBar } from "./CoinSearchBar";
import { ManageCoinsButton } from "./ManageCoinsButton";
import { EmptyNftsState } from "./EmptyNftsState";
import { useTabPager } from "./use-tab-pager";
import { buildContainerStyle, buildEmptyImageStyle, buildEmptyStateStyle } from "./coins-section-styles";

export function CoinsSection() {
  const { colors, scale: { scaleSize: scale } } = useTheme();
  const [activeTab, setActiveTab] = useState<CoinTabKey>("coins");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageWidth, setPageWidth] = useState(0);
  const { scrollRef, scrollToTab, onScrollEnd, onLayout } = useTabPager(setActiveTab);

  const containerStyle = useMemo(() => buildContainerStyle(scale, colors), [scale, colors]);
  const emptyImageStyle = useMemo(() => buildEmptyImageStyle(scale), [scale]);
  const emptyStateStyle = useMemo(() => buildEmptyStateStyle(scale), [scale]);

  const handleSearchPress = useCallback(() => setIsSearchActive(true), []);
  const handleCancelSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery("");
  }, []);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setPageWidth(width);
    onLayout(width);
  }, [onLayout]);

  return (
    <View style={containerStyle}>
      <CoinsTabs activeTab={activeTab} onTabChange={scrollToTab} onSearchPress={handleSearchPress} />
      {isSearchActive && (
        <CoinSearchBar value={searchQuery} onChangeText={setSearchQuery} onCancel={handleCancelSearch} />
      )}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onLayout={handleLayout}
        scrollEventThrottle={16}
      >
        <View style={{ width: pageWidth }}>
          <EmptyCoinsState imageStyle={emptyImageStyle} stateStyle={emptyStateStyle} textColor={colors.tertiaryText} />
          <ManageCoinsButton />
        </View>
        <View style={{ width: pageWidth }}>
          <EmptyNftsState />
        </View>
      </ScrollView>
    </View>
  );
}

interface EmptyCoinsStateProps {
  imageStyle: ImageStyle;
  stateStyle: ViewStyle;
  textColor: string;
}

function EmptyCoinsState({ imageStyle, stateStyle, textColor }: EmptyCoinsStateProps) {
  return (
    <View style={[styles.emptyState, stateStyle]}>
      <Image source={emptyCoinsImage} style={imageStyle} />
      <Text variant="caption2" color={textColor}>{translate("walletUi:emptyCoinsMessage")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", justifyContent: "center" },
});
