import { useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useWalletViews, useActiveWalletView, switchWalletView } from "@ion/wallet";
import { WalletViewListItem } from "./WalletViewListItem";

interface WalletViewSwitcherViewProps {
  onNavigateToManage: () => void;
}

export function WalletViewSwitcherView({ onNavigateToManage }: WalletViewSwitcherViewProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const walletViews = useWalletViews();
  const activeWallet = useActiveWalletView();

  const handleWalletPress = useCallback(
    (walletId: string) => {
      if (walletId !== activeWallet.id) switchWalletView(walletId);
    },
    [activeWallet.id],
  );

  const containerStyle = useMemo(() => ({ gap: scale(16), padding: scale(16) }), [scale]);
  const manageButtonStyle = useMemo(() => buildManageButtonStyle(theme), [theme]);

  return (
    <View style={containerStyle}>
      <WalletViewList walletViews={walletViews} activeId={activeWallet.id} onPress={handleWalletPress} />
      <TouchableOpacity style={[styles.centeredRow, manageButtonStyle]} onPress={onNavigateToManage} accessibilityRole="button">
        <Icon name="button-manage-wallet" size={scale(24)} color={theme.colors.primaryAccent} />
        <Text variant="body" color={theme.colors.primaryText}>{translate("walletUi:manageWalletsButton")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function WalletViewList({ walletViews, activeId, onPress }: { walletViews: readonly { id: string; name: string; balance: string; isMain: boolean }[]; activeId: string; onPress: (id: string) => void }) {
  return (
    <>
      {walletViews.map((wallet) => (
        <WalletViewListItem key={wallet.id} wallet={wallet} mode={wallet.id === activeId ? "selected" : "unselected"} onPress={() => onPress(wallet.id)} />
      ))}
    </>
  );
}

function buildManageButtonStyle(theme: ReturnType<typeof useTheme>) {
  const scale = theme.scale.scaleSize;
  return {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: theme.scale.scaleRadius(16),
    borderWidth: 1,
    borderColor: theme.colors.onSecondaryBackground,
    height: scale(54),
    gap: scale(9),
  };
}

const styles = StyleSheet.create({
  centeredRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
