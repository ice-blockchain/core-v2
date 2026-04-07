import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { SingleActionSheetScreen, useAppNavigation } from "@ion/navigation";

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

export function LinkDeviceScreen() {
  const navigation = useAppNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleContinue = useCallback(() => {
    if (timerRef.current) return;
    setIsLoading(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      markLinkDeviceShown();
      if (navigation.canGoBack()) navigation.goBack();
    }, 2000);
  }, [navigation]);

  return (
    <SingleActionSheetScreen
      iconName="action-login-linkaccount"
      iconColor="white"
      title={translate("auth:linkDeviceTitle")}
      description={<LinkDeviceDescription />}
      buttonLabel={translate("auth:continueButton")}
      onPress={handleContinue}
      isLoading={isLoading}
      isDismissable={false}
    />
  );
}

const styles = StyleSheet.create({
  descriptionText: {
    textAlign: "center",
  },
});
