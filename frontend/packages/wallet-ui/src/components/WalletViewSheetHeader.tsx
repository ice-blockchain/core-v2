import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";

interface WalletViewSheetHeaderProps {
  title?: string;
  onBack?: () => void;
  onClose: () => void;
}

export function WalletViewSheetHeader({ title, onBack, onClose }: WalletViewSheetHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const headerStyle = useMemo(() => buildHeaderStyle(scale), [scale]);
  const spacerStyle = useMemo(() => ({ width: scale(24) }), [scale]);

  return (
    <View style={[styles.header, headerStyle]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8}>
          <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
        </Pressable>
      ) : (
        <View style={spacerStyle} />
      )}
      {title ? <Text variant="subtitle">{title}</Text> : <View />}
      <Pressable onPress={onClose} hitSlop={8}>
        <Icon name="sheet-close" size={scale(24)} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
}

function buildHeaderStyle(scale: (n: number) => number) {
  const topPadding = Platform.OS === "web" ? scale(20) : scale(8);
  return { paddingHorizontal: scale(16), paddingTop: topPadding, paddingBottom: scale(16) };
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
