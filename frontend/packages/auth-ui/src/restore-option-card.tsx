import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface RestoreOptionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
}

export function RestoreOptionCard({ icon, title, description, onPress }: RestoreOptionCardProps) {
  const { colors } = useTheme();

  const cardStyle = useMemo(() => ({
    ...styles.card,
    backgroundColor: colors.tertiaryBackground,
  }), [colors.tertiaryBackground]);

  return (
    <Pressable style={cardStyle} onPress={onPress}>
      <View style={styles.content}>
        {icon}
        <View style={styles.textContainer}>
          <Text variant="body" color={colors.primaryText}>{title}</Text>
          <Text variant="caption3" color={colors.secondaryText} style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 8,
  },
  textContainer: {
    alignItems: "center",
    gap: 4,
  },
  description: {
    textAlign: "center",
    width: 258,
  },
});
