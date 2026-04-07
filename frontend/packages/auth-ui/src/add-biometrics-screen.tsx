import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent, Routes, useAppNavigation } from "@ion/navigation";

function AddBiometricsDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:addBiometricsDescription")}
    </Text>
  );
}

function buildButtonRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    gap: scale(15),
    paddingHorizontal: scale(16),
    paddingBottom: scale(20),
    paddingTop: scale(28),
  };
}

function buildCancelButtonStyle(scale: (n: number) => number, borderColor: string): ViewStyle {
  return {
    flex: 1,
    height: scale(56),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor,
    alignItems: "center",
    justifyContent: "center",
  };
}

function buildContinueButtonStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flex: 1,
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor,
    alignItems: "center",
    justifyContent: "center",
  };
}

function useNavigateToVerify(method: "Password" | "Biometrics") {
  const appNavigation = useAppNavigation();

  return useCallback(() => {
    if (appNavigation.canGoBack()) appNavigation.goBack();
    requestAnimationFrame(() => {
      appNavigation.navigate(Routes.Sheet.Verify, {
        next: { name: Routes.Catalog, reset: true },
        method,
      });
    });
  }, [appNavigation, method]);
}

function ActionButtons() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;
  const navigateToVerifyPassword = useNavigateToVerify("Password");
  const navigateToVerifyBiometrics = useNavigateToVerify("Biometrics");

  const rowStyle = useMemo(() => buildButtonRowStyle(scale), [scale]);
  const cancelStyle = useMemo(() => buildCancelButtonStyle(scale, colors.strokeElements), [scale, colors.strokeElements]);
  const continueStyle = useMemo(() => buildContinueButtonStyle(scale, colors.primaryAccent), [scale, colors.primaryAccent]);

  return (
    <View style={rowStyle}>
      <Pressable style={cancelStyle} onPress={navigateToVerifyPassword}>
        <Text variant="body" color={colors.secondaryText}>{translate("auth:cancelButton")}</Text>
      </Pressable>
      <Pressable style={continueStyle} onPress={navigateToVerifyBiometrics}>
        <Text variant="body" color={colors.onPrimaryAccent}>{translate("auth:continueButton")}</Text>
      </Pressable>
    </View>
  );
}

export function AddBiometricsScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const navigation = useAppNavigation();

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <DynamicSheet showClose={false} onDismiss={handleDismiss}>
      <InformationSheetContent
        icon={<Icon name="action-wallet-faceid" size={scale(80)} />}
        title={translate("auth:addBiometricsTitle")}
        description={<AddBiometricsDescription />}
        topPadding={30}
      />
      <ActionButtons />
    </DynamicSheet>
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
