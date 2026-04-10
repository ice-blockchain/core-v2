import { useMemo } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

export function ManageCoinsButton() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const buttonStyle = useMemo(
    () => ({
      height: scale(56),
      borderRadius: theme.radii.large,
      backgroundColor: theme.colors.tertiaryBackground,
      gap: scale(9),
    }),
    [scale, theme.radii.large, theme.colors],
  );

  return (
    <TouchableOpacity style={[styles.button, buttonStyle]} accessibilityLabel={translate("walletUi:manageCoinsButton")} accessibilityRole="button">
      <Icon name="manage" size={scale(24)} color={theme.colors.primaryAccent} />
      <Text variant="body" color={theme.colors.primaryText}>
        {translate("walletUi:manageCoinsButton")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
