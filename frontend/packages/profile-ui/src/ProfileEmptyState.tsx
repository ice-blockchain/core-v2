import { useMemo } from "react";
import { Image, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Text, useTheme } from "@ion/ui";

interface ProfileEmptyStateProps {
  image: ImageSourcePropType;
  text: string;
}

export function ProfileEmptyState({ image, text }: ProfileEmptyStateProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const imageSize = useMemo(
    () => ({ width: scale(48), height: scale(48) }),
    [scale],
  );

  return (
    <View style={styles.container}>
      <Image source={image} style={imageSize} />
      <Text variant="caption2" color={theme.colors.tertiaryText}>{text}</Text>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 60,
  },
};
