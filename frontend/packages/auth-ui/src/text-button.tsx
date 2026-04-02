import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface TextButtonProps {
  label: string;
  onPress?: () => void;
  leftIcon?: ReactNode;
}

export function TextButton({ label, onPress, leftIcon }: TextButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable style={styles.button} onPress={onPress}>
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
    paddingHorizontal: 24,
  },
});
