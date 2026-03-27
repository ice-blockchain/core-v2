import { useCallback, useMemo } from "react";
import { Pressable, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { Text, Icon, useTheme } from "@ion/ui";

export interface CheckboxRowProps {
  flag: string;
  name: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
}

function buildRowStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  };
}

function buildLeftStyle(scale: (n: number) => number): ViewStyle {
  return { flexDirection: "row", alignItems: "center", gap: scale(16) };
}

function buildFlagStyle(scale: (n: number) => number): TextStyle {
  return { fontSize: scale(15) };
}

export function CheckboxRow({ flag, name, isSelected, onPress, testID }: CheckboxRowProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const rowStyle = useMemo(
    () => buildRowStyle(scale, theme.colors.tertiaryBackground),
    [scale, theme.colors.tertiaryBackground],
  );
  const leftStyle = useMemo(() => buildLeftStyle(scale), [scale]);
  const flagStyle = useMemo(() => buildFlagStyle(scale), [scale]);
  const handlePress = useCallback(() => onPress(), [onPress]);

  return (
    <Pressable style={rowStyle} onPress={handlePress} testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} accessibilityLabel={name}>
      <View style={leftStyle}>
        <Text style={flagStyle}>{flag}</Text>
        <Text variant="subtitle2">{name}</Text>
      </View>
      <Icon
        name={isSelected ? "checkbox-on" : "checkbox-off"}
        size={scale(24)}
        color={isSelected ? theme.colors.success : theme.colors.tertiaryText}
      />
    </Pressable>
  );
}
