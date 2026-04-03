import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";

export function SecuredByFooter() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="caption" color={colors.secondaryText}>{translate("auth:securedByLabel")}</Text>
      <Icon name="login-identity" size={20} color={colors.primaryAccent} />
      <Text variant="caption" color={colors.primaryAccent}>Identity.io</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
