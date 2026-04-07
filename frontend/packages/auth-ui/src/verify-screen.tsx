import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { VerifyMethodType } from "@ion/navigation";
import { SecuredByFooter } from "./secured-by-footer";

const AUTO_DISMISS_DELAY = 3000;

const VERIFY_TEXT_KEYS: Record<VerifyMethodType, { title: string; subtitle: string }> = {
  Passkey: { title: "auth:verifyPasskeyTitle", subtitle: "auth:verifyPasskeySubtitle" },
  Password: { title: "auth:verifyPasswordTitle", subtitle: "auth:verifyPasswordSubtitle" },
  Biometrics: { title: "auth:verifyBiometricsTitle", subtitle: "auth:verifyBiometricsSubtitle" },
};

interface VerifyScreenProps {
  onDismiss: () => void;
  loadingElement: ReactNode;
  method?: VerifyMethodType;
  disableAutoDismiss?: boolean;
}

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return useMemo(() => ({
    page: { ...styles.page, paddingTop: scale(40) },
    iconContainer: {
      width: scale(80),
      height: scale(80),
      marginBottom: scale(20),
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    textGroup: { ...styles.textGroup, marginTop: scale(8), maxWidth: scale(320) },
    loader: { marginTop: scale(66) },
    footer: { marginTop: "auto" as const, paddingBottom: scale(40) },
  }), [scale]);
}

export function VerifyScreen({ onDismiss, loadingElement, method = "Passkey", disableAutoDismiss = false }: VerifyScreenProps) {
  const { colors, scale } = useTheme();
  const screenStyles = useScreenStyles();
  const textKeys = VERIFY_TEXT_KEYS[method];

  useEffect(() => {
    if (disableAutoDismiss) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_DELAY);
    return () => clearTimeout(timer);
  }, [onDismiss, disableAutoDismiss]);

  return (
    <View style={screenStyles.page}>
      <View style={screenStyles.iconContainer}>
        <Icon name="action-wallet-passkey" size={scale.scaleSize(80)} color={colors.tertiaryText} />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate(textKeys.title)}</Text>
      <View style={screenStyles.textGroup}>
        <Text variant="body2" color={colors.tertiaryText} style={styles.centerText}>
          {translate(textKeys.subtitle)}
        </Text>
      </View>
      <View style={screenStyles.loader}>
        {loadingElement}
      </View>
      <View style={screenStyles.footer}>
        <SecuredByFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  textGroup: {
    alignItems: "center",
  },
  centerText: {
    textAlign: "center",
  },
});
