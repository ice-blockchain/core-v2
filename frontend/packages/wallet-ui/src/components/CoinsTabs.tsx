import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { CoinTabKey } from "../types";

interface CoinsTabsProps {
  activeTab: CoinTabKey;
  onTabChange: (tab: CoinTabKey) => void;
  onSearchPress: () => void;
}

export function CoinsTabs({ activeTab, onTabChange, onSearchPress }: CoinsTabsProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const tabGapStyle = useMemo(() => ({ gap: theme.spacing.xl }), [theme.spacing.xl]);

  const coinsColor = activeTab === "coins" ? theme.colors.primaryText : theme.colors.tertiaryText;
  const nftsColor = activeTab === "nfts" ? theme.colors.primaryText : theme.colors.tertiaryText;

  return (
    <View style={styles.tabHeader}>
      <View style={[styles.tabs, tabGapStyle]}>
        <TouchableOpacity onPress={() => onTabChange("coins")} accessibilityLabel={translate("walletUi:coinsTab")} accessibilityRole="tab">
          <Text variant="title" color={coinsColor}>{translate("walletUi:coinsTab")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange("nfts")} accessibilityLabel={translate("walletUi:nftsTab")} accessibilityRole="tab">
          <Text variant="title" color={nftsColor}>{translate("walletUi:nftsTab")}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onSearchPress} accessibilityLabel={translate("walletUi:searchPlaceholder")} accessibilityRole="button">
        <Icon name="field-search" size={scale(20)} color={theme.colors.primaryText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabs: { flexDirection: "row", alignItems: "center" },
});
