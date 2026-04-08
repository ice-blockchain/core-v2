import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent, Routes, useAppNavigation } from "@ion/navigation";

function AddPasskeyCredentialsDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:addPasskeyCredentialsDescription")}
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

function buildSkipButtonStyle(scale: (n: number) => number, borderColor: string): ViewStyle {
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

function ActionButtons() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;
  const navigateToVerifyPasskey = useNavigateToVerify();

  const rowStyle = useMemo(() => buildButtonRowStyle(scale), [scale]);
  const skipStyle = useMemo(() => buildSkipButtonStyle(scale, colors.strokeElements), [scale, colors.strokeElements]);
  const continueStyle = useMemo(() => buildContinueButtonStyle(scale, colors.primaryAccent), [scale, colors.primaryAccent]);

  return (
    <View style={rowStyle}>
      <Pressable style={skipStyle} onPress={navigateToVerifyPasskey}>
        <Text variant="body" color={colors.secondaryText}>{translate("auth:skipButton")}</Text>
      </Pressable>
      <Pressable style={continueStyle} onPress={navigateToVerifyPasskey}>
        <Text variant="body" color={colors.onPrimaryAccent}>{translate("auth:continueButton")}</Text>
      </Pressable>
    </View>
  );
}

export function AddPasskeyCredentialsScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const navigation = useAppNavigation();

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <DynamicSheet showClose={false} onDismiss={handleDismiss}>
      <InformationSheetContent
        icon={<Icon name="action-wallet-addpasskey" size={scale(80)} />}
        title={translate("auth:addPasskeyCredentialsTitle")}
        description={<AddPasskeyCredentialsDescription />}
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
