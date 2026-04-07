import { useMemo } from "react";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Icon } from "../icons/Icon";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";

interface SheetCloseHeaderProps {
  readonly title?: string;
  readonly showClose?: boolean;
  readonly onClose: () => void;
  readonly closeIconColor?: string;
  readonly testID?: string;
}

function buildHeaderStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(16),
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    backgroundColor,
  };
}

export function SheetCloseHeader({ title, showClose = true, onClose, closeIconColor, testID }: SheetCloseHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const iconSize = scale(24);
  const headerStyle = useMemo(() => buildHeaderStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]);
  const spacerStyle = useMemo((): ViewStyle => ({ width: iconSize }), [iconSize]);
  const iconColor = closeIconColor ?? theme.colors.tertiaryText;

  return (
    <View style={headerStyle}>
      {showClose ? <View style={spacerStyle} /> : null}
      {title ? <Text variant="subtitle">{title}</Text> : <View />}
      {showClose ? (
        <Pressable onPress={onClose} hitSlop={8} testID={testID} accessibilityRole="button">
          <Icon name="sheet-close" size={iconSize} color={iconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}
