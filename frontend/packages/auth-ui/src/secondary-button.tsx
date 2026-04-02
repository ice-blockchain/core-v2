import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  leftIcon?: ReactNode;
}

export function SecondaryButton({ label, onPress, leftIcon }: SecondaryButtonProps) {
  const theme = useTheme();
  const { colors } = theme;

  const buttonStyle = useMemo(() => ({
    ...styles.button,
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.strokeElements,
  }), [colors.secondaryBackground, colors.strokeElements]);

  return (
    <Pressable style={buttonStyle} onPress={onPress}>
      {leftIcon && <View>{leftIcon}</View>}
      <Text variant="body" color={colors.secondaryText}>{label}</Text>
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
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 24,
  },
});
