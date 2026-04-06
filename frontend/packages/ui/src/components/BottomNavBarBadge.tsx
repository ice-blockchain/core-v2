import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { buildBadgeContainerStyle } from "./bottom-nav-bar-styles";

interface BottomNavBarBadgeProps {
  count: number;
}

function formatBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function BottomNavBarBadge({ count }: BottomNavBarBadgeProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerStyle = useMemo(
    () => buildBadgeContainerStyle(scale, theme.colors.attentionRed),
    [scale, theme.colors.attentionRed],
  );

  return (
    <View style={containerStyle}>
      <Text variant="notificationCaption" color={theme.colors.onPrimaryAccent}>
        {formatBadgeCount(count)}
      </Text>
    </View>
  );
}
