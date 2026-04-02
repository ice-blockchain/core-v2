import { useMemo } from "react";
import { View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";

export interface DescriptionItemProps {
  iconName: IconName;
  text: string;
  testID?: string;
}

function buildRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(11),
  };
}

const textStyle: TextStyle = { flex: 1 };

export function DescriptionItem({ iconName, text, testID }: DescriptionItemProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const { colors } = theme;

  const rowStyle = useMemo(() => buildRowStyle(scale), [scale]);

  return (
    <View style={rowStyle} testID={testID}>
      <Icon name={iconName} size={scale(27)} color={colors.primaryText} />
      <Text variant="body2" color={colors.secondaryText} style={textStyle}>{text}</Text>
    </View>
  );
}
