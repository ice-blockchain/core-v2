import { useMemo } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import { Text, useTheme } from "@ion/ui";

type ScaleFunction = (n: number) => number;

function buildRowStyle(scale: ScaleFunction, borderColor: string, showBorder: boolean): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: showBorder ? 0.5 : 0,
    borderBottomColor: borderColor,
  };
}

interface ContextMenuItemProps {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onPress: () => void;
  readonly isDanger?: boolean;
  readonly isLast?: boolean;
}

export function ContextMenuItem({ label, icon, onPress, isDanger, isLast }: ContextMenuItemProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const rowStyle = useMemo(
    () => buildRowStyle(scale, theme.colors.onTertiaryFill, !isLast),
    [scale, theme.colors.onTertiaryFill, isLast],
  );
  const textColor = isDanger ? theme.colors.attentionRed : theme.colors.primaryText;

  return (
    <Pressable style={rowStyle} onPress={onPress}>
      <Text variant="subtitle3" color={textColor}>{label}</Text>
      {icon}
    </Pressable>
  );
}
