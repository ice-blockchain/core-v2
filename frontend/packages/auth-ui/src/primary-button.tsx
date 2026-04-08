import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { ArrowIcon } from "./arrow-icon";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  showArrow?: boolean;
}

export function PrimaryButton({ label, onPress, style, disabled, loading, showArrow = true }: PrimaryButtonProps) {
  const { colors, scale } = useTheme();
  const isDisabled = disabled || loading;

  const buttonStyle = useMemo(() => ({
    ...styles.button,
    backgroundColor: colors.primaryAccent,
    gap: scale.scaleSize(9),
    width: scale.scaleSize(287),
    height: scale.scaleSize(56),
    borderRadius: scale.scaleRadius(16),
    paddingHorizontal: scale.scaleSize(24),
  }), [colors.primaryAccent, scale]);

  return (
    <Pressable
      style={[buttonStyle, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading
        ? <ActivityIndicator color={colors.onPrimaryAccent} />
        : <Text variant="body" color={colors.onPrimaryAccent}>{label}</Text>}
      {showArrow && !loading && <ArrowIcon size={scale.scaleSize(15)} color={colors.onPrimaryAccent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
});
