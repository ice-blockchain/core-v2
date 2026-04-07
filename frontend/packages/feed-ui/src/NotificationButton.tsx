import { useMemo } from "react";
import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import { Icon, useTheme } from "@ion/ui";

interface NotificationButtonProps {
  onPress?: () => void;
}

function buildButtonStyle(scale: (n: number) => number, bgColor: string, borderColor: string): ViewStyle {
  return {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(16),
    backgroundColor: bgColor,
    borderWidth: 1,
    borderColor,
    justifyContent: "center",
    alignItems: "center",
  };
}

export function NotificationButton({ onPress }: NotificationButtonProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const buttonStyle = useMemo(
    () => buildButtonStyle(scale, theme.colors.tertiaryBackground, theme.colors.onTertiaryFill),
    [scale, theme.colors],
  );

  return (
    <Pressable style={buttonStyle} onPress={onPress} accessibilityRole="button" accessibilityLabel="Notifications">
      <Icon name="notification-bell" size={scale(20)} color={theme.colors.primaryText} />
    </Pressable>
  );
}
