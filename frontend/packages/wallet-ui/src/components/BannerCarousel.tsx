import { useCallback, useMemo, useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from "react-native";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { portfolioBannerImage, swapBannerImage, bridgeBannerImage } from "../assets/wallet-images";
import { BannerCard } from "./BannerCard";
import { buildCarouselPaddingStyle } from "./banner-carousel-styles";

const BANNER_DATA = [
  { key: "portfolio", titleKey: "portfolioTitle", descKey: "portfolioDescription", image: portfolioBannerImage },
  { key: "swap", titleKey: "swapBannerTitle", descKey: "swapBannerDescription", image: swapBannerImage },
  { key: "bridge", titleKey: "bridgeBannerTitle", descKey: "bridgeBannerDescription", image: bridgeBannerImage },
] as const;

type BannerItem = (typeof BANNER_DATA)[number];
const ITEM_COUNT = BANNER_DATA.length;

export function BannerCarousel() {
  const scale = useTheme().scale.scaleSize;
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - scale(32);
  const snap = cardWidth + scale(12);
  const [activeIndex, setActiveIndex] = useState(0);
  const contentStyle = useMemo(() => buildCarouselPaddingStyle(scale), [scale]);
  const cardStyle = useMemo<ViewStyle>(() => ({ width: cardWidth }), [cardWidth]);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / snap));
  }, [snap]);
  const renderItem = useCallback(
    ({ item }: { item: BannerItem }) => renderBannerCard(item, cardStyle, activeIndex),
    [cardStyle, activeIndex],
  );

  return (
    <FlatList
      data={BANNER_DATA} renderItem={renderItem} keyExtractor={extractKey}
      horizontal snapToInterval={snap} snapToAlignment="start"
      decelerationRate="fast" showsHorizontalScrollIndicator={false}
      onScroll={onScroll} scrollEventThrottle={16}
      contentContainerStyle={contentStyle}
    />
  );
}

function renderBannerCard(item: BannerItem, style: ViewStyle, activeIndex: number) {
  return (
    <View style={style}>
      <BannerCard
        title={translate(`walletUi:${item.titleKey}`)}
        description={translate(`walletUi:${item.descKey}`)}
        image={item.image}
        dotCount={ITEM_COUNT}
        activeIndex={activeIndex}
      />
    </View>
  );
}

function extractKey(item: BannerItem) {
  return item.key;
}
