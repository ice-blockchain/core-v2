import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
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
  const toggleBalance = useCallback(() => setIsBalanceVisible((p) => !p), []);
  const s = useWalletScreenStyles(isScrolled);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsScrolled(e.nativeEvent.contentOffset.y > 0);
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.headerWrapper}><WalletHeader /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={s.scrollContent} onScroll={handleScroll} scrollEventThrottle={16}>
        <View style={s.gap}>
          <View style={s.header}>
            <BalanceDisplay isBalanceVisible={isBalanceVisible} onToggleVisibility={toggleBalance} />
            <ActionButtonsRow />
          </View>
          <View style={s.banner}><BannerCarousel /></View>
          <FriendsSection />
          <CoinsSection />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ scroll: { flex: 1 } });
