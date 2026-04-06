import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { Text } from "./Text";
import { buildActionRowStyle, buildActionIconBoxStyle } from "./bottom-nav-bar-styles";
import type { BottomNavBarSheetAction } from "./bottom-nav-bar-types";

interface BottomNavBarSheetActionRowProps {
  action: BottomNavBarSheetAction;
}

export function BottomNavBarSheetActionRow({ action }: BottomNavBarSheetActionRowProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const rowStyle = useMemo(() => buildActionRowStyle(scale), [scale]);
  const iconBoxStyle = useMemo(
    () => buildActionIconBoxStyle(scale, action.iconBackgroundColor),
    [scale, action.iconBackgroundColor],
  );

  return (
    <Pressable style={rowStyle} onPress={action.onPress} testID={action.testID}>
      <View style={iconBoxStyle}>
        <Icon name={action.iconName} size={scale(24)} color={theme.colors.onPrimaryAccent} />
      </View>
      <View>
        <Text variant="subtitle2">{action.title}</Text>
        <Text variant="caption" color={theme.colors.tertiaryText}>
          {action.description}
        </Text>
      </View>
    </Pressable>
  );
}
