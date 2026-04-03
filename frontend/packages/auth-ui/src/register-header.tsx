import { type ReactNode, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface RegisterHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function RegisterHeader({ icon, title, subtitle }: RegisterHeaderProps) {
  const { colors, scale } = useTheme();

  const iconCircleStyle = useMemo(() => ({
    width: scale.scaleSize(65),
    height: scale.scaleSize(65),
    borderRadius: scale.scaleRadius(32.5),
    backgroundColor: colors.primaryAccent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: scale.scaleSize(20),
  }), [colors.primaryAccent, scale]);

  const subtitleStyle = useMemo(() => ({
    textAlign: "center" as const,
    maxWidth: scale.scaleSize(320),
  }), [scale]);

  return (
    <View style={styles.container}>
      <View style={iconCircleStyle}>
        {icon}
      </View>
      <Text variant="headline1" color={colors.primaryText} style={styles.titleText}>{title}</Text>
      {subtitle ? (
        <Text variant="body2" color={colors.tertiaryText} style={subtitleStyle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  titleText: {
    textAlign: "center",
  },
});
