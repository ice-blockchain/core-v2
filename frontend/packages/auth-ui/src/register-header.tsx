import { type ReactNode, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface RegisterHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function RegisterHeader({ icon, title, subtitle }: RegisterHeaderProps) {
  const { colors } = useTheme();

  const iconCircleStyle = useMemo(() => ({
    ...styles.iconCircle,
    backgroundColor: colors.primaryAccent,
  }), [colors.primaryAccent]);

  return (
    <View style={styles.container}>
      <View style={iconCircleStyle}>
        {icon}
      </View>
      <Text variant="headline1" color={colors.primaryText}>{title}</Text>
      {subtitle ? (
        <Text variant="body2" color={colors.tertiaryText} style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 320,
  },
});
