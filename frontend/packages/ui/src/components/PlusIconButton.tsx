import { useMemo } from "react";
import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";

export interface PlusIconButtonProps {
  size?: number;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

const DEFAULT_SIZE = 24;
const BORDER_WIDTH = 1.5;

function buildButtonStyle(options: { size: number; scale: (n: number) => number; bgColor: string; borderColor: string }): ViewStyle {
  const { size, scale, bgColor, borderColor } = options;
  const scaledSize = scale(size);
  return {
    width: scaledSize,
    height: scaledSize,
    borderRadius: scaledSize / 2,
    backgroundColor: bgColor,
    borderWidth: BORDER_WIDTH,
    borderColor,
    justifyContent: "center",
    alignItems: "center",
  };
}

export function PlusIconButton({ size = DEFAULT_SIZE, onPress, accessibilityLabel = "Add", testID }: PlusIconButtonProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const buttonStyle = useMemo(
    () => buildButtonStyle({ size, scale, bgColor: theme.colors.primaryAccent, borderColor: theme.colors.secondaryBackground }),
    [size, scale, theme.colors],
  );

  const iconSize = scale(size * (2 / 3));

  return (
    <Pressable style={buttonStyle} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID}>
      <Icon name="plus-createchannel" size={iconSize} color={theme.colors.secondaryBackground} />
    </Pressable>
  );
}
