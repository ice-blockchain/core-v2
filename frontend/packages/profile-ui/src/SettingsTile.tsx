import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";

interface SettingsTileProps {
  iconName: IconName;
  iconColor: string;
  label: string;
  valueLabel?: string | undefined;
  rightType?: "arrow" | "checkbox" | undefined;
  checked?: boolean | undefined;
  onPress: () => void;
}

export function SettingsTile(props: SettingsTileProps) {
  const { iconName, iconColor, label, valueLabel, rightType = "arrow", checked, onPress } = props;
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(scale, theme.colors.tertiaryBackground), [scale, theme.colors]);
  const iconBoxStyle = useMemo(() => buildIconBoxStyle(scale, theme.colors.secondaryBackground, theme.colors.onTertiaryFill), [scale, theme.colors]);

  return (
    <Pressable style={containerStyle} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.leftRow}>
        <View style={iconBoxStyle}>
          <Icon name={iconName} size={scale(24)} color={iconColor} />
        </View>
        <Text variant="body">{label}</Text>
      </View>
      <TileRightSide rightType={rightType} valueLabel={valueLabel} checked={checked} />
    </Pressable>
  );
}

function TileRightSide({ rightType, valueLabel, checked }: { rightType: string; valueLabel?: string | undefined; checked?: boolean | undefined }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  if (rightType === "checkbox") {
    return <Icon name={checked ? "checkbox-on" : "checkbox-off"} size={scale(24)} color={theme.colors.primaryAccent} />;
  }
  return (
    <View style={[styles.rightRow, { gap: scale(12) }]}>
      {valueLabel ? <Text variant="caption" color={theme.colors.primaryAccent}>{valueLabel}</Text> : null}
      <Icon name="arrow-right" size={scale(24)} color={theme.colors.quaternaryText} />
    </View>
  );
}

function buildContainerStyle(scale: (n: number) => number, backgroundColor: string) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: scale(12),
    borderRadius: scale(16),
    backgroundColor,
  };
}

function buildIconBoxStyle(scale: (n: number) => number, backgroundColor: string, borderColor: string) {
  return {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor,
    borderWidth: 1,
    borderColor,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: scale(10),
  };
}

const styles = StyleSheet.create({
  leftRow: { flexDirection: "row", alignItems: "center" },
  rightRow: { flexDirection: "row", alignItems: "center" },
});
