import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { colorPalette } from "../tokens/color-palette";
import { HorizontalSeparator } from "./HorizontalSeparator";
import { FeedFiltersMenuItem } from "./FeedFiltersMenuItem";
import type { FeedCategory, FeedFilter } from "./feed-filters-menu-types";

interface OverlayProps {
  category: FeedCategory;
  filter: FeedFilter;
  onCategoryChange: (category: FeedCategory) => void;
  onFilterChange: (filter: FeedFilter) => void;
  labels: { feed: string; videos: string; articles: string; forYou: string; following: string };
}

export function FeedFiltersMenuOverlay(props: OverlayProps) {
  const { category, filter, onCategoryChange, onFilterChange, labels } = props;
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => ({ paddingVertical: scale(16), gap: scale(10) }), [scale]);
  const white = theme.colors.secondaryBackground;

  return (
    <View style={containerStyle}>
      <FeedFiltersMenuItem label={labels.feed} iconName="profile-feed" iconColor={white} iconBackgroundColor={colorPalette.purple} isSelected={category === "feed"} onPress={() => onCategoryChange("feed")} />
      <FeedFiltersMenuItem label={labels.videos} iconName="videos-trading" iconColor={white} iconBackgroundColor={colorPalette.raspberry} isSelected={category === "videos"} onPress={() => onCategoryChange("videos")} />
      <FeedFiltersMenuItem label={labels.articles} iconName="articles" iconColor={white} iconBackgroundColor={theme.colors.success} isSelected={category === "articles"} onPress={() => onCategoryChange("articles")} />
      <HorizontalSeparator />
      <FeedFiltersMenuItem label={labels.forYou} iconName="categories-foryou" iconColor={theme.colors.primaryText} iconBackgroundColor={theme.colors.tertiaryBackground} isSelected={filter === "forYou"} isFilterStyle onPress={() => onFilterChange("forYou")} />
      <FeedFiltersMenuItem label={labels.following} iconName="categories-following" iconColor={theme.colors.primaryText} iconBackgroundColor={theme.colors.tertiaryBackground} isSelected={filter === "following"} isFilterStyle onPress={() => onFilterChange("following")} />
    </View>
  );
}
