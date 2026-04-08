import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DoubleActionSheetScreen, Routes, useAppNavigation } from "@ion/navigation";

function VerifyOnOtherDeviceDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:verifyOnOtherDeviceDescription")}
    </Text>
  );
}

export function VerifyOnOtherDeviceScreen() {
  const navigation = useAppNavigation();

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    requestAnimationFrame(() => {
      navigation.navigate(Routes.Sheet.AddPasskeyCredentials);
    });
  }, [navigation]);

  return (
    <DoubleActionSheetScreen
      iconName="action-login-linkaccount"
      iconColor="white"
      title={translate("auth:verifyOnOtherDeviceTitle")}
      description={<VerifyOnOtherDeviceDescription />}
      secondaryLabel={translate("auth:cancelButton")}
      primaryLabel={translate("auth:continueButton")}
      onSecondaryPress={handleDismiss}
      onPrimaryPress={handleContinue}
      onDismiss={handleDismiss}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
