import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { ActionButton } from "./ActionButton";

export function ActionButtonsRow() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const rowStyle = useMemo(
    () => ({ gap: scale(12), paddingHorizontal: scale(16) }),
    [scale],
  );

  return (
    <View style={[styles.row, rowStyle]}>
      <ActionButton iconName="wallet-buycrypto" label={translate("walletUi:buyAction")} filled />
      <ActionButton iconName="button-qrcode" label={translate("walletUi:receiveAction")} />
      <ActionButton iconName="wallet-swap" label={translate("walletUi:swapAction")} />
      <ActionButton iconName="wallet-more" label={translate("walletUi:moreAction")} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
