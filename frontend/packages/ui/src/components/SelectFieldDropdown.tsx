import { useMemo } from "react";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";

export const SELECT_FIELD_Z_INDEX = 20;

export interface SelectFieldDropdownProps {
  options: string[];
  onSelect: (value: string) => void;
  isVisible: boolean;
}

function buildDropdownStyle(options: { colors: { strokeElements: string; secondaryBackground: string }; scaleSize: (n: number) => number; scaleRadius: (n: number) => number }): ViewStyle {
  const { colors, scaleSize, scaleRadius } = options;
  return {
    position: "absolute",
    top: scaleSize(4),
    left: 0,
    right: 0,
    borderRadius: scaleRadius(16),
    borderWidth: 1,
    borderColor: colors.strokeElements,
    backgroundColor: colors.secondaryBackground,
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(16),
    gap: scaleSize(16),
    zIndex: SELECT_FIELD_Z_INDEX,
  };
}

function DropdownOption({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

export function SelectFieldDropdown({ options, onSelect, isVisible }: SelectFieldDropdownProps) {
  const theme = useTheme();

  const dropdownStyle = useMemo(
    () => buildDropdownStyle({ colors: theme.colors, scaleSize: theme.scale.scaleSize, scaleRadius: theme.scale.scaleRadius }),
    [theme.colors, theme.scale],
  );

  if (!isVisible) return null;

  return (
    <View style={dropdownStyle}>
      {options.map((option, index) => (
        <DropdownOption key={`${option}-${index}`} label={option} onPress={() => onSelect(option)} />
      ))}
    </View>
  );
}
