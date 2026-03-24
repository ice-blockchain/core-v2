import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { ArrowIcon } from "./arrow-icon";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, style }: PrimaryButtonProps) {
  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <ArrowIcon size={15} />
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
    backgroundColor: "#0166FF",
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
});
