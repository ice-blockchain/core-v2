import { useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { Logger } from "@ion/diagnostics";
import { useWalletViews, useActiveWalletView, switchWalletView } from "@ion/wallet";
import type { WalletView } from "@ion/wallet";
import { useWalletViewNavigation } from "@ion/navigation";
import { WalletViewListItem } from "../../components/WalletViewListItem";

function useSwitchHandler(activeId: string) {
  return useCallback(
    (walletId: string) => {
      if (walletId === activeId) return;
      try {
        switchWalletView(walletId);
      } catch (error) {
        Logger.error("switchWalletView failed", {
          tag: "wallet",
          error: error instanceof Error ? error : new Error(String(error)),
          data: { walletId },
        });
      }
    },
    [activeId],
  );
}

export function WalletViewSwitcherScreen() {
  const theme = useTheme();
  const walletViewNav = useWalletViewNavigation();
  const walletViews = useWalletViews();
  const activeWallet = useActiveWalletView();
  const handleWalletPress = useSwitchHandler(activeWallet.id);

  const containerStyle = useMemo(
    () => ({ gap: theme.spacing.lg, padding: theme.spacing.lg }),
    [theme.spacing.lg],
  );
  const manageButtonStyle = useMemo(() => buildManageButtonStyle(theme), [theme]);

  return (
    <View style={containerStyle}>
      <WalletViewList walletViews={walletViews} activeId={activeWallet.id} onPress={handleWalletPress} />
      <TouchableOpacity style={[styles.centeredRow, manageButtonStyle]} onPress={walletViewNav.openManage} accessibilityRole="button">
        <Icon name="button-manage-wallet" size={theme.scale.scaleSize(24)} color={theme.colors.primaryAccent} />
        <Text variant="body" color={theme.colors.primaryText}>{translate("walletUi:manageWalletsButton")}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface WalletViewListProps {
  walletViews: readonly WalletView[];
  activeId: string;
  onPress: (walletId: string) => void;
}

function WalletViewList({ walletViews, activeId, onPress }: WalletViewListProps) {
  return (
    <>
      {walletViews.map((wallet) => (
        <WalletViewListItem
          key={wallet.id}
          wallet={wallet}
          mode={wallet.id === activeId ? "selected" : "unselected"}
          onPress={onPress}
        />
      ))}
    </>
  );
}

function buildManageButtonStyle(theme: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: theme.radii.large,
    borderWidth: 1,
    borderColor: theme.colors.onSecondaryBackground,
    height: theme.scale.scaleSize(54),
    gap: theme.scale.scaleSize(9),
  };
}

const styles = StyleSheet.create({
  centeredRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
