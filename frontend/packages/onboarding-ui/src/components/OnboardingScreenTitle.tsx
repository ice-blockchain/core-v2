import { useMemo } from "react";
import { View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";

export interface OnboardingScreenTitleProps {
  title: string;
  subtitle: string;
}

const subtitleStyle: TextStyle = { textAlign: "center" };

function buildContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: "center",
    gap: scale(8),
    paddingTop: scale(16),
  };
}

export function OnboardingScreenTitle({ title, subtitle }: OnboardingScreenTitleProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(scale), [scale]);

  return (
    <View style={containerStyle}>
      <Text variant="headline1">{title}</Text>
      <Text variant="body2" color={theme.colors.tertiaryText} style={subtitleStyle}>{subtitle}</Text>
    </View>
  );
}
