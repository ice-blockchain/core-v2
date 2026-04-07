import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DoubleActionSheetScreen, Routes, useAppNavigation } from "@ion/navigation";

function AddPasskeyCredentialsDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:addPasskeyCredentialsDescription")}
    </Text>
  );
}

function useNavigateToVerify() {
  const appNavigation = useAppNavigation();

  return useCallback(() => {
    if (appNavigation.canGoBack()) appNavigation.goBack();
    requestAnimationFrame(() => {
      appNavigation.navigate(Routes.Sheet.Verify, {
        next: { name: Routes.Main, reset: true },
      });
    });
  }, [appNavigation]);
}

export function AddPasskeyCredentialsScreen() {
  const navigation = useAppNavigation();
  const navigateToVerifyPasskey = useNavigateToVerify();

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <DoubleActionSheetScreen
      iconName="action-wallet-addpasskey"
      title={translate("auth:addPasskeyCredentialsTitle")}
      description={<AddPasskeyCredentialsDescription />}
      secondaryLabel={translate("auth:skipButton")}
      primaryLabel={translate("auth:continueButton")}
      onSecondaryPress={navigateToVerifyPasskey}
      onPrimaryPress={navigateToVerifyPasskey}
      onDismiss={handleDismiss}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
