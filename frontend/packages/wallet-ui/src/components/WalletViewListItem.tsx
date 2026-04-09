import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text, useTheme, colorPalette } from "@ion/ui";
import type { WalletView } from "@ion/wallet";

type WalletViewListItemMode = "selected" | "unselected" | "manage";

interface WalletViewListItemProps {
  wallet: WalletView;
  mode: WalletViewListItemMode;
  onPress: () => void;
}

export function WalletViewListItem({ wallet, mode, onPress }: WalletViewListItemProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(theme, mode), [theme, mode]);
  const iconBoxStyle = useMemo(() => buildIconBoxStyle(scale, theme.scale.scaleRadius), [scale, theme.scale.scaleRadius]);
  const leftGap = useMemo(() => ({ gap: scale(10) }), [scale]);
  const nameColor = mode === "selected" ? colorPalette.white : theme.colors.primaryText;
  const balanceColor = mode === "selected" ? theme.colors.onColors : theme.colors.tertiaryText;

  return (
    <TouchableOpacity style={[styles.container, containerStyle]} onPress={onPress} accessibilityRole="button">
      <View style={[styles.leftSection, leftGap]}>
        <View style={[styles.center, iconBoxStyle]}>
          <Icon name="wallet" size={scale(24)} color={colorPalette.white} />
        </View>
        <View style={styles.textGroup}>
          <Text variant="body" color={nameColor}>{wallet.name}</Text>
          <Text variant="caption3" color={balanceColor}>{wallet.balance}</Text>
        </View>
      </View>
      <WalletViewListItemRight mode={mode} scale={scale} />
    </TouchableOpacity>
  );
}

const ROTATED_ICON_STYLE = { transform: [{ rotate: "-90deg" as const }] };

function WalletViewListItemRight({ mode, scale }: { mode: WalletViewListItemMode; scale: (n: number) => number }) {
  if (mode === "manage") {
    return (
      <View style={ROTATED_ICON_STYLE}>
        <Icon name="chevron-down" size={scale(20)} />
      </View>
    );
  }
  if (mode === "selected") return <Icon name="checkbox-on" size={scale(24)} />;
  return null;
}

function buildIconBoxStyle(scale: (n: number) => number, scaleRadius: (n: number) => number) {
  return {
    width: scale(36),
    height: scale(36),
    borderRadius: scaleRadius(10),
    backgroundColor: colorPalette.darkBlue,
  };
}

function buildContainerStyle(theme: ReturnType<typeof useTheme>, mode: WalletViewListItemMode) {
  const scale = theme.scale.scaleSize;
  const base = { paddingVertical: scale(11), paddingHorizontal: scale(16), borderRadius: theme.scale.scaleRadius(16) };
  if (mode === "selected") return { ...base, backgroundColor: theme.colors.primaryAccent };
  return { ...base, backgroundColor: theme.colors.tertiaryBackground, borderWidth: 1, borderColor: theme.colors.onSecondaryBackground };
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  textGroup: { gap: 2 },
});
