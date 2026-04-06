import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Button, Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent, useAppNavigation } from "@ion/navigation";

let linkDeviceShown = false;

export function hasLinkDeviceBeenShown(): boolean {
  return linkDeviceShown;
}

export function markLinkDeviceShown(): void {
  linkDeviceShown = true;
}

function LinkDeviceDescription() {
  const { colors } = useTheme();

  return (
    <Text variant="body2" color={colors.secondaryText} style={styles.descriptionText}>
      {translate("auth:linkDeviceDescription")}
    </Text>
  );
}

function buildButtonContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingBottom: scale(20),
    paddingTop: scale(28),
  };
}

function ContinueButton() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const navigation = useAppNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const containerStyle = useMemo(() => buildButtonContainerStyle(scale), [scale]);

  const handleContinue = useCallback(() => {
    setIsLoading(true);
    timerRef.current = setTimeout(() => {
      markLinkDeviceShown();
      if (navigation.canGoBack()) navigation.goBack();
    }, 2000);
  }, [navigation]);

  return (
    <View style={containerStyle}>
      <Button
        label={translate("auth:continueButton")}
        isLoading={isLoading}
        onPress={handleContinue}
      />
    </View>
  );
}

export function LinkDeviceScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <DynamicSheet showClose={false} isDismissable={false}>
      <InformationSheetContent
        icon={<Icon name="action-login-linkaccount" size={scale(80)} color="white" />}
        title={translate("auth:linkDeviceTitle")}
        description={<LinkDeviceDescription />}
      />
      <ContinueButton />
    </DynamicSheet>
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
