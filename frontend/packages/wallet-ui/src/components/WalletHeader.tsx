import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme, colorPalette } from "@ion/ui";
import { translate } from "@ion/localization";
import { useActiveWalletView } from "@ion/wallet";
import { buildPillStyle, buildScanButtonStyle } from "./wallet-header-styles";

interface WalletHeaderProps {
  onWalletPress: () => void;
}

export function WalletHeader({ onWalletPress }: WalletHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const activeWallet = useActiveWalletView();

  const pillStyle = useMemo(() => buildPillStyle(theme), [theme]);
  const scanStyle = useMemo(() => buildScanButtonStyle(theme), [theme]);
  const walletBoxStyle = useMemo(
    () => ({ width: scale(28), height: scale(28), borderRadius: theme.radii.small, backgroundColor: colorPalette.darkBlue }),
    [scale, theme.radii.small],
  );
  const innerGap = useMemo(() => ({ gap: theme.spacing.sm }), [theme.spacing.sm]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.pill, pillStyle]} onPress={onWalletPress} accessibilityLabel={translate("walletUi:switchWalletLabel", { name: activeWallet.name })} accessibilityRole="button">
        <View style={[styles.innerGroup, innerGap]}>
          <View style={[styles.center, walletBoxStyle]}>
            <Icon name="wallet" size={scale(16)} color={colorPalette.white} />
          </View>
          <Text variant="subtitle2">{activeWallet.name}</Text>
        </View>
        <Icon name="chevron-down" size={scale(20)} color={theme.colors.primaryText} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.center, scanStyle]} accessibilityLabel={translate("walletUi:scanButtonLabel")} accessibilityRole="button">
        <Icon name="header-scan" size={scale(24)} color={theme.colors.primaryText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: { flexDirection: "row", alignItems: "center" },
  innerGroup: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center" },
});
