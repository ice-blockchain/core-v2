import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { FEED_NAMESPACE } from "./translations";

export function FeedEmptyContent() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <View style={styles.container}>
      <Icon name="wallet-icon-profile-emptyposts" size={scale(48)} color={theme.colors.tertiaryText} />
      <Text variant="caption2" color={theme.colors.tertiaryText}>
        {translate(`${FEED_NAMESPACE}:emptyTitle`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
});
