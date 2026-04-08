import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { IconName } from "@ion/ui";

interface BalanceDisplayProps {
  isBalanceVisible: boolean;
  onToggleVisibility: () => void;
}

function getBalanceState(isVisible: boolean) {
  const iconName: IconName = isVisible ? "block-eye-on" : "block-eye-off";
  const textKey = isVisible ? "walletUi:balanceAmount" : "walletUi:balanceHidden";
  return { iconName, balanceText: translate(textKey) };
}

export function BalanceDisplay({ isBalanceVisible, onToggleVisibility }: BalanceDisplayProps) {
  const { colors, scale: { scaleSize: scale } } = useTheme();
  const { iconName, balanceText } = getBalanceState(isBalanceVisible);

  const labelRowStyle = useMemo(() => ({ gap: scale(5) }), [scale]);
  const gapStyle = useMemo(() => ({ gap: scale(4) }), [scale]);

  return (
    <View style={[styles.container, gapStyle]}>
      <TouchableOpacity onPress={onToggleVisibility} style={[styles.labelRow, labelRowStyle]}>
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
