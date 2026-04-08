import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { FeedCategory } from "@ion/ui";
import { translate } from "@ion/localization";
import { FEED_NAMESPACE } from "./translations";

const EMPTY_TITLE_KEY: Record<FeedCategory, string> = {
  feed: "emptyTitle",
  videos: "emptyVideosTitle",
  articles: "emptyArticlesTitle",
};

interface FeedEmptyContentProps {
  category: FeedCategory;
}

export function FeedEmptyContent({ category }: FeedEmptyContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <View style={styles.container}>
      <Icon name="wallet-icon-profile-emptyposts" size={scale(48)} color={theme.colors.tertiaryText} />
      <Text variant="caption2" color={theme.colors.tertiaryText}>
        {translate(`${FEED_NAMESPACE}:${EMPTY_TITLE_KEY[category]}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
});
