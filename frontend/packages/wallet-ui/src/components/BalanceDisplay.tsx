import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useActiveWalletView } from "@ion/wallet";
import type { IconName } from "@ion/ui";

interface BalanceDisplayProps {
  isBalanceVisible: boolean;
  onToggleVisibility: () => void;
}

function getBalanceState(isVisible: boolean, balance: string) {
  const iconName: IconName = isVisible ? "block-eye-on" : "block-eye-off";
  const balanceText = isVisible ? balance : translate("walletUi:balanceHidden");
  return { iconName, balanceText };
}

export function BalanceDisplay({ isBalanceVisible, onToggleVisibility }: BalanceDisplayProps) {
  const theme = useTheme();
  const { colors } = theme;
  const scale = theme.scale.scaleSize;
  const activeView = useActiveWalletView();
  const { iconName, balanceText } = getBalanceState(isBalanceVisible, activeView.balance);

  const labelRowStyle = useMemo(() => ({ gap: scale(5) }), [scale]);
  const gapStyle = useMemo(() => ({ gap: theme.spacing.xs }), [theme.spacing.xs]);

  return (
    <View style={[styles.container, gapStyle]}>
      <TouchableOpacity onPress={onToggleVisibility} style={[styles.labelRow, labelRowStyle]} accessibilityLabel={translate("walletUi:toggleBalanceLabel")} accessibilityRole="button">
        <Text variant="subtitle2" color={colors.secondaryText}>{translate("walletUi:balanceLabel")}</Text>
        <Icon name={iconName} size={scale(24)} color={colors.secondaryText} />
      </TouchableOpacity>
      <Text variant="headline1" color={colors.primaryText}>{balanceText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
