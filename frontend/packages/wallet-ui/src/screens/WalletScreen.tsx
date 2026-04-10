import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Routes, useSheetNavigation } from "@ion/navigation";
import { BottomSnackBar, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { WalletHeader } from "../components/WalletHeader";
import { BalanceDisplay } from "../components/BalanceDisplay";
import { ActionButtonsRow } from "../components/ActionButtonsRow";
import { FriendsSection } from "../components/FriendsSection";
import { BannerCarousel } from "../components/BannerCarousel";
import { CoinsSection } from "../components/CoinsSection";
import { useWalletScreenStyles } from "./useWalletScreenStyles";

export function WalletScreen() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSnackBarVisible, setIsSnackBarVisible] = useState(false);
  const navigation = useSheetNavigation();
  const theme = useTheme();
  const scaleSize = theme.scale.scaleSize;
  const toggleBalance = useCallback(() => setIsBalanceVisible((p) => !p), []);
  const openSheet = useCallback(() => navigation.navigate(Routes.Sheet.WalletViewManagement), [navigation]);
  const showSnackBar = useCallback(() => setIsSnackBarVisible(true), []);
  const hideSnackBar = useCallback(() => setIsSnackBarVisible(false), []);
  const s = useWalletScreenStyles(isScrolled);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsScrolled(e.nativeEvent.contentOffset.y > 0);
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.headerWrapper}><WalletHeader onWalletPress={openSheet} /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={s.scrollContent} onScroll={handleScroll} scrollEventThrottle={16}>
        <View style={s.gap}>
          <View style={s.header}>
            <BalanceDisplay isBalanceVisible={isBalanceVisible} onToggleVisibility={toggleBalance} />
            <ActionButtonsRow onBuyPress={showSnackBar} />
          </View>
          <View style={s.banner}><BannerCarousel /></View>
          <FriendsSection />
          <CoinsSection />
        </View>
      </ScrollView>
      <View style={[styles.snackBarWrapper, { paddingHorizontal: scaleSize(16), paddingBottom: scaleSize(16) }]}>
        <BottomSnackBar
          message={translate("walletUi:buyCryptoComingSoon") ?? "Buy crypto easily. Coming soon."}
          isVisible={isSnackBarVisible}
          onDismiss={hideSnackBar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  snackBarWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
});