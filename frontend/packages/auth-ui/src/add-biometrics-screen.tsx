import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DoubleActionSheetScreen, Routes, useAppNavigation } from "@ion/navigation";

function AddBiometricsDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:addBiometricsDescription")}
    </Text>
  );
}

function useNavigateToVerify(method: "Password" | "Biometrics") {
  const appNavigation = useAppNavigation();

  return useCallback(() => {
    if (appNavigation.canGoBack()) appNavigation.goBack();
    requestAnimationFrame(() => {
      appNavigation.navigate(Routes.Sheet.Verify, {
        next: { name: Routes.Main, reset: true },
        method,
      });
    });
  }, [appNavigation, method]);
}

export function AddBiometricsScreen() {
  const navigation = useAppNavigation();
  const navigateToVerifyPassword = useNavigateToVerify("Password");
  const navigateToVerifyBiometrics = useNavigateToVerify("Biometrics");

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <DoubleActionSheetScreen
      iconName="action-wallet-faceid"
      title={translate("auth:addBiometricsTitle")}
      description={<AddBiometricsDescription />}
      secondaryLabel={translate("auth:cancelButton")}
      primaryLabel={translate("auth:continueButton")}
      onSecondaryPress={navigateToVerifyPassword}
      onPrimaryPress={navigateToVerifyBiometrics}
      onDismiss={handleDismiss}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
