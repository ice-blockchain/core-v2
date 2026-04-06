import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";

interface PasswordRule {
  label: string;
  isMet: boolean;
}

interface PasswordStrengthChecklistProps {
  rules: PasswordRule[];
}

export function PasswordStrengthChecklist({ rules }: PasswordStrengthChecklistProps) {
  const { colors, scale } = useTheme();
  const dynamicStyles = useMemo(() => ({
    container: { gap: scale.scaleSize(6) },
    row: { ...styles.row, gap: scale.scaleSize(6) },
  }), [scale]);
  const iconSize = scale.scaleSize(16);

  return (
    <View style={dynamicStyles.container}>
      {rules.map((rule) => (
        <View key={rule.label} style={dynamicStyles.row}>
          <Icon name={rule.isMet ? "password-check-pass" : "password-check-fail"} size={iconSize} />
          <Text variant="caption2" color={colors.primaryText}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
