import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { Text, colorPalette, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { SingleActionSheetScreen, useAppNavigation, Routes } from "@ion/navigation";

function RestoreSuccessDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.description}>
      {translate("auth:restoreSuccessDescription")}
    </Text>
  );
}

export function RestoreSuccessScreen() {
  const navigation = useAppNavigation();

  const handleLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: Routes.GetStarted }] });
  }, [navigation]);

  return (
    <SingleActionSheetScreen
      iconName="keys-success"
      iconColor={colorPalette.white}
      title={translate("auth:restoreSuccessTitle")}
      description={<RestoreSuccessDescription />}
      buttonLabel={translate("auth:loginButton")}
      onPress={handleLogin}
      isDismissable
    />
  );
}

const styles = StyleSheet.create({
  description: {
    textAlign: "center",
  },
});
