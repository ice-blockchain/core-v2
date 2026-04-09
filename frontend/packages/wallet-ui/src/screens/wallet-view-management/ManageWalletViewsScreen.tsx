import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useWalletViews, MAX_WALLET_VIEWS } from "@ion/wallet";
import { useWalletViewNavigation } from "@ion/navigation";
import { WalletViewListItem } from "../../components/WalletViewListItem";

export function ManageWalletViewsScreen() {
  const walletViewNav = useWalletViewNavigation();
  const theme = useTheme();
  const walletViews = useWalletViews();
  const canCreate = walletViews.length < MAX_WALLET_VIEWS;
  const containerStyle = useMemo(
    () => ({ gap: theme.spacing.sm, padding: theme.spacing.lg }),
    [theme.spacing.sm, theme.spacing.lg],
  );
  const createButtonStyle = useMemo(() => buildCreateButtonStyle(theme), [theme]);

  return (
    <View style={containerStyle}>
      {canCreate && (
        <TouchableOpacity style={[styles.centeredRow, createButtonStyle]} onPress={walletViewNav.openCreate} accessibilityRole="button">
          <Icon name="button-addstroke" size={theme.scale.scaleSize(24)} color={theme.colors.onPrimaryAccent} />
          <Text variant="body" color={theme.colors.onPrimaryAccent}>{translate("walletUi:createWalletButton")}</Text>
        </TouchableOpacity>
      )}
      {walletViews.map((wallet) => (
        <WalletViewListItem key={wallet.id} wallet={wallet} mode="manage" onPress={walletViewNav.openEdit} />
      ))}
    </View>
  );
}

function buildCreateButtonStyle(theme: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: theme.colors.primaryAccent,
    borderRadius: theme.radii.large,
    height: theme.scale.scaleSize(54),
    gap: theme.spacing.sm,
  };
}

const styles = StyleSheet.create({
  centeredRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
