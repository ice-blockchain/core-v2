import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useWalletViews, MAX_WALLET_VIEWS } from "@ion/wallet";
import { WalletViewListItem } from "./WalletViewListItem";

interface ManageWalletViewsViewProps {
  onNavigateToCreate: () => void;
  onNavigateToEdit: (walletId: string) => void;
}

export function ManageWalletViewsView({ onNavigateToCreate, onNavigateToEdit }: ManageWalletViewsViewProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const walletViews = useWalletViews();
  const canCreate = walletViews.length < MAX_WALLET_VIEWS;
  const containerStyle = useMemo(() => ({ gap: scale(8), padding: scale(16) }), [scale]);
  const createButtonStyle = useMemo(() => buildCreateButtonStyle(theme), [theme]);

  return (
    <View style={containerStyle}>
      {canCreate && (
        <TouchableOpacity style={[styles.centeredRow, createButtonStyle]} onPress={onNavigateToCreate} accessibilityRole="button">
          <Icon name="button-addstroke" size={scale(24)} color={theme.colors.onPrimaryAccent} />
          <Text variant="body" color={theme.colors.onPrimaryAccent}>{translate("walletUi:createWalletButton")}</Text>
        </TouchableOpacity>
      )}
      {walletViews.map((wallet) => (
        <WalletViewListItem key={wallet.id} wallet={wallet} mode="manage" onPress={() => onNavigateToEdit(wallet.id)} />
      ))}
    </View>
  );
}

function buildCreateButtonStyle(theme: ReturnType<typeof useTheme>) {
  const scale = theme.scale.scaleSize;
  return {
    backgroundColor: theme.colors.primaryAccent,
    borderRadius: theme.scale.scaleRadius(16),
    height: scale(54),
    gap: scale(8),
  };
}

const styles = StyleSheet.create({
  centeredRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
