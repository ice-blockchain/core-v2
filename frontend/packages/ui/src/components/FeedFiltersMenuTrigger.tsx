import { forwardRef, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { colorPalette } from "../tokens/color-palette";
import { Icon } from "../icons/Icon";
import type { FeedCategory, FeedFilter, CategoryConfig, FilterConfig } from "./feed-filters-menu-types";
import { buildTriggerStyle, buildBadgeStyle } from "./feed-filters-menu-trigger-styles";

const CATEGORY_CONFIG: Record<FeedCategory, CategoryConfig> = {
  feed: { iconName: "profile-feed", color: colorPalette.purple },
  videos: { iconName: "videos-trading", color: colorPalette.raspberry },
  articles: { iconName: "articles", color: "#35D487" },
};

const FILTER_CONFIG: Record<FeedFilter, FilterConfig> = {
  forYou: { iconName: "categories-foryou" },
  following: { iconName: "categories-following" },
};

interface TriggerProps {
  category: FeedCategory;
  filter: FeedFilter;
  onPress: () => void;
}

export const FeedFiltersMenuTrigger = forwardRef<View, TriggerProps>(function FeedFiltersMenuTrigger(
  { category, filter, onPress },
  ref,
) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const catConfig = CATEGORY_CONFIG[category];
  const bgColor = category === "articles" ? theme.colors.success : catConfig.color;

  const triggerStyle = useMemo(() => buildTriggerStyle(scale, bgColor), [scale, bgColor]);
  const badgeStyle = useMemo(
    () => buildBadgeStyle(scale, bgColor, theme.colors.secondaryBackground),
    [scale, bgColor, theme.colors],
  );

  return (
    <Pressable ref={ref} style={triggerStyle} onPress={onPress} accessibilityRole="button" accessibilityLabel="Feed filters">
      <Icon name={catConfig.iconName} size={scale(24)} color={theme.colors.secondaryBackground} />
      <View style={badgeStyle}>
        <Icon name={FILTER_CONFIG[filter].iconName} size={scale(12)} color={theme.colors.secondaryBackground} />
      </View>
    </Pressable>
  );
});
