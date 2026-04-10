import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { Text, useTheme, formatCryptoAmount, formatUsdAmount } from "@ion/ui";
import type { CoinsGroup } from "@ion/wallet";
import { CoinIcon } from "./CoinIcon";

interface CoinListItemProps {
  readonly group: CoinsGroup;
  readonly isBalanceVisible: boolean;
}

function useCoinListItemStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const radius = theme.scale.scaleRadius;
  const { colors } = theme;

  return useMemo(() => ({
    container: {
      backgroundColor: colors.tertiaryBackground,
      borderRadius: radius(16),
      padding: scale(12),
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    left: { flexDirection: "row" as const, gap: scale(10), alignItems: "center" as const, flex: 1 },
    leftText: { flex: 1 },
    colors,
  }), [colors, radius, scale]);
}

const HIDDEN_AMOUNT = "****";
const HIDDEN_USD = "******";

function CoinListItemComponent({ group, isBalanceVisible }: CoinListItemProps) {
  const s = useCoinListItemStyles();

  return (
    <View style={s.container}>
      <View style={s.left}>
        <CoinIcon uri={group.iconURL} />
        <View style={s.leftText}>
          <Text variant="body" color={s.colors.primaryText} numberOfLines={1}>{group.name}</Text>
          <Text variant="caption3" color={s.colors.secondaryText} numberOfLines={1}>{group.abbreviation}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text variant="body" color={s.colors.primaryText}>
          {isBalanceVisible ? formatCryptoAmount(group.totalAmount, group.abbreviation) : HIDDEN_AMOUNT}
        </Text>
        <Text variant="caption3" color={s.colors.secondaryText}>
          {isBalanceVisible ? formatUsdAmount(group.totalBalanceUSD) : HIDDEN_USD}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  right: { alignItems: "flex-end" },
});

export const CoinListItem = memo(CoinListItemComponent);
