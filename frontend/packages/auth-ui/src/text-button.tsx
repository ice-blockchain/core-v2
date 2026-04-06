import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface TextButtonProps {
  label: string;
  onPress?: () => void;
  leftIcon?: ReactNode;
}

export function TextButton({ label, onPress, leftIcon }: TextButtonProps) {
  const { colors, scale } = useTheme();

  const buttonStyle = useMemo(() => ({
    ...styles.button,
    gap: scale.scaleSize(9),
    width: scale.scaleSize(287),
    height: scale.scaleSize(56),
    paddingHorizontal: scale.scaleSize(24),
    borderRadius: scale.scaleRadius(16),
  }), [scale]);

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
  },
});
