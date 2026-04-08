import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";

interface ProfileInfoTileProps {
  iconName: IconName;
  text: string;
  textColor?: string;
  onPress?: () => void;
}

export function ProfileInfoTile({ iconName, text, textColor, onPress }: ProfileInfoTileProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const resolvedColor = textColor ?? theme.colors.quaternaryText;

  const containerStyle = useMemo(
    () => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: scale(4),
      paddingRight: scale(2),
    }),
    [scale],
  );

  const content = (
    <>
      <Icon name={iconName} size={scale(14)} color={resolvedColor} />
      <Text variant="caption2" color={resolvedColor}>{text}</Text>
    </>
  );

  if (onPress) {
    return <Pressable style={containerStyle} onPress={onPress}>{content}</Pressable>;
  }

  return <View style={containerStyle}>{content}</View>;
}
