import { useCallback, useMemo } from "react";
import { Linking, Pressable, StyleSheet } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { externalLinks } from "@ion/config";

export function IdentityBrand() {
  const { colors, scale } = useTheme();

  const containerStyle = useMemo(() => ({
    ...styles.container,
    gap: scale.scaleSize(4),
  }), [scale]);

  const handlePress = useCallback(() => {
    Linking.openURL(externalLinks.identity);
  }, []);

  return (
    <Pressable style={containerStyle} onPress={handlePress} accessibilityRole="link">
      <Icon name="login-identity" size={scale.scaleSize(20)} color={colors.primaryAccent} />
      <Text variant="caption" color={colors.primaryAccent}>Identity.io</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
});
