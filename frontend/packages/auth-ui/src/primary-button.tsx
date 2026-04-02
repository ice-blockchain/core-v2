import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { ArrowIcon } from "./arrow-icon";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  showArrow?: boolean;
}

export function PrimaryButton({ label, onPress, style, disabled, showArrow = true }: PrimaryButtonProps) {
  const theme = useTheme();
  const { colors } = theme;

  const buttonStyle = useMemo(() => ({
    ...styles.button,
    backgroundColor: colors.primaryAccent,
  }), [colors.primaryAccent]);

  return (
    <Pressable
      style={[buttonStyle, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text variant="body" color={colors.onPrimaryAccent}>{label}</Text>
      {showArrow && <ArrowIcon size={15} color={colors.onPrimaryAccent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: 287,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.4,
  },
});
