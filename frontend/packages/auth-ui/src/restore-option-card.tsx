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

function useCardStyles() {
  const { colors, scale } = useTheme();

  return useMemo(() => ({
    card: {
      ...styles.card,
      borderRadius: scale.scaleRadius(16),
      paddingVertical: scale.scaleSize(16),
      paddingHorizontal: scale.scaleSize(20),
      backgroundColor: colors.tertiaryBackground,
    },
    content: { ...styles.content, gap: scale.scaleSize(8) },
    textContainer: { ...styles.textContainer, gap: scale.scaleSize(4) },
  }), [colors.tertiaryBackground, scale]);
}

export function RestoreOptionCard({ icon, title, description, onPress }: RestoreOptionCardProps) {
  const { colors } = useTheme();
  const cardStyles = useCardStyles();

  return (
    <Pressable style={cardStyles.card} onPress={onPress}>
      <View style={cardStyles.content}>
        {icon}
        <View style={cardStyles.textContainer}>
          <Text variant="body" color={colors.primaryText}>{title}</Text>
          <Text variant="caption3" color={colors.secondaryText} style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
  },
  description: {
    textAlign: "center",
  },
});
