import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { ActionButton } from "./ActionButton";

interface ActionButtonsRowProps {
  onBuyPress?: () => void;
}

export function ActionButtonsRow({ onBuyPress }: ActionButtonsRowProps) {
  const theme = useTheme();

  const rowStyle = useMemo(
    () => ({ gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }),
    [theme.spacing.md, theme.spacing.lg],
  );

  return (
    <View style={[styles.row, rowStyle]}>
      <ActionButton iconName="wallet-buycrypto" label={translate("walletUi:buyAction")} filled {...(onBuyPress ? { onPress: onBuyPress } : {})} />
      <ActionButton iconName="button-qrcode" label={translate("walletUi:receiveAction")} />
      <ActionButton iconName="wallet-swap" label={translate("walletUi:swapAction")} />
      <ActionButton iconName="wallet-more" label={translate("walletUi:moreAction")} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});