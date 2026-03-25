import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  leftIcon?: ReactNode;
}

export function SecondaryButton({ label, onPress, leftIcon }: SecondaryButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      {leftIcon && <View>{leftIcon}</View>}
      <Text style={styles.label}>{label}</Text>
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: "#494949",
  },
});
