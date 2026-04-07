import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { IdentityBrand } from "./identity-brand";

export function SecuredByFooter() {
  const { colors, scale } = useTheme();

  const containerStyle = useMemo(() => ({
    ...styles.container,
    gap: scale.scaleSize(6),
  }), [scale]);

  return (
    <View style={containerStyle}>
      <Text variant="caption" color={colors.secondaryText}>{translate("auth:securedByLabel")}</Text>
      <IdentityBrand />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
