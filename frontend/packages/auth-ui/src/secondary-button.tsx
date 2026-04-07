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
  const { colors, scale } = useTheme();

  const buttonStyle = useMemo(() => ({
    ...styles.button,
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.strokeElements,
    gap: scale.scaleSize(9),
    width: scale.scaleSize(287),
    height: scale.scaleSize(56),
    borderRadius: scale.scaleRadius(16),
    paddingHorizontal: scale.scaleSize(24),
  }), [colors.secondaryBackground, colors.strokeElements, scale]);

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
    borderWidth: 1,
  },
});
