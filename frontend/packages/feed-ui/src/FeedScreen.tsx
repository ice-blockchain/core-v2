import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@ion/ui";
import { FeedHeader } from "./FeedHeader";
import { FeedStoriesSection } from "./FeedStoriesSection";
import { FeedEmptyContent } from "./FeedEmptyContent";
import { useFeedFilterState } from "./use-feed-filter-state";

export function FeedScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { category, filter, onCategoryChange, onFilterChange } = useFeedFilterState();

  const rootStyle = useMemo(
    () => ({ flex: 1, backgroundColor: theme.colors.secondaryBackground }),
    [theme.colors],
  );

  const separatorStyle = useMemo(
    () => ({ height: scale(4), backgroundColor: theme.colors.primaryBackground }),
    [scale, theme.colors],
  );

  return (
    <View style={rootStyle}>
      <FeedHeader category={category} filter={filter} onCategoryChange={onCategoryChange} onFilterChange={onFilterChange} />
      <FeedStoriesSection />
      <View style={separatorStyle} />
      <View style={styles.content}>
        <FeedEmptyContent category={category} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
