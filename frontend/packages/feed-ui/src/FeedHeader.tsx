import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchBar, FeedFiltersMenuButton, useTheme } from "@ion/ui";
import type { FeedCategory, FeedFilter } from "@ion/ui";
import { translate } from "@ion/localization";
import { NotificationButton } from "./NotificationButton";
import { buildHeaderStyle } from "./feed-header-styles";
import { FEED_NAMESPACE } from "./translations";

const NS = FEED_NAMESPACE;

interface FeedHeaderProps {
  category: FeedCategory;
  filter: FeedFilter;
  onCategoryChange: (category: FeedCategory) => void;
  onFilterChange: (filter: FeedFilter) => void;
}

function useMenuLabels() {
  return useMemo(() => ({
    feed: translate(`${NS}:categoryFeed`),
    videos: translate(`${NS}:categoryVideos`),
    articles: translate(`${NS}:categoryArticles`),
    forYou: translate(`${NS}:filterForYou`),
    following: translate(`${NS}:filterFollowing`),
  }), []);
}

export function FeedHeader({ category, filter, onCategoryChange, onFilterChange }: FeedHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const labels = useMenuLabels();

  const headerStyle = useMemo(
    () => buildHeaderStyle(theme.scale.scaleSize, insets.top),
    [theme.scale.scaleSize, insets.top],
  );

  const handleNotificationPress = useCallback(() => {}, []);

  return (
    <View style={headerStyle}>
      <View style={styles.searchContainer}>
        <SearchBar value={searchText} onChangeText={setSearchText} placeholder={translate(`${NS}:searchPlaceholder`)} />
      </View>
      <NotificationButton onPress={handleNotificationPress} />
      <FeedFiltersMenuButton category={category} filter={filter} onCategoryChange={onCategoryChange} onFilterChange={onFilterChange} labels={labels} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: { flex: 1 },
});
