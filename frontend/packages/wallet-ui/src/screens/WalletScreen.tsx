import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { BottomSnackBar, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { WalletHeader } from "../components/WalletHeader";
import { BalanceDisplay } from "../components/BalanceDisplay";
import { ActionButtonsRow } from "../components/ActionButtonsRow";
import { FriendsSection } from "../components/FriendsSection";
import { BannerCarousel } from "../components/BannerCarousel";
import { CoinsSection } from "../components/CoinsSection";
import { useWalletScreenStyles } from "./useWalletScreenStyles";
import { useWalletActions } from "./useWalletActions";

export function WalletScreen() {
  const [isScrolled, setIsScrolled] = useState(false);
  const s = useWalletScreenStyles(isScrolled);
  const actions = useWalletActions();
  const theme = useTheme();
  const scaleSize = theme.scale.scaleSize;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsScrolled(e.nativeEvent.contentOffset.y > 0);
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.headerWrapper}><WalletHeader onWalletPress={actions.openSheet} /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={s.scrollContent} onScroll={handleScroll} scrollEventThrottle={16}>
        <View style={s.gap}>
          <View style={s.header}>
            <BalanceDisplay isBalanceVisible={actions.isBalanceVisible} onToggleVisibility={actions.toggleBalance} />
            <ActionButtonsRow {...(actions.showSnackBar ? { onBuyPress: actions.showSnackBar } : {})} />
          </View>
          <View style={s.banner}><BannerCarousel /></View>
          <FriendsSection />
          <CoinsSection />
        </View>
      </ScrollView>
      <View style={[styles.snackBarWrapper, { paddingHorizontal: scaleSize(16), paddingBottom: scaleSize(16) }]}>
        <BottomSnackBar message={translate("walletUi:buyCryptoComingSoon")} isVisible={actions.isSnackBarVisible} onDismiss={actions.hideSnackBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  snackBarWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
});