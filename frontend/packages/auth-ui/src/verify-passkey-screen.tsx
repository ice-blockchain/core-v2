import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { SecuredByFooter } from "./secured-by-footer";

const AUTO_DISMISS_DELAY = 3000;

interface VerifyPasskeyScreenProps {
  onDismiss: () => void;
  loadingElement: ReactNode;
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

export function VerifyPasskeyScreen({ onDismiss, loadingElement }: VerifyPasskeyScreenProps) {
  const { colors, scale } = useTheme();
  const screenStyles = useScreenStyles();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_DELAY);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View style={screenStyles.page}>
      <View style={screenStyles.iconContainer}>
        <Icon name="action-wallet-passkey" size={scale.scaleSize(80)} color={colors.tertiaryText} />
      </View>
      <Text variant="headline1" color={colors.primaryText}>{translate("auth:verifyPasskeyTitle")}</Text>
      <View style={screenStyles.textGroup}>
        <Text variant="body2" color={colors.tertiaryText} style={styles.centerText}>
          {translate("auth:verifyPasskeySubtitle")}
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
