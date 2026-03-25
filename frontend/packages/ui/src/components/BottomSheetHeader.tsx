import { useMemo } from "react";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";
import { Icon } from "../icons/Icon";

interface BottomSheetHeaderProps {
  title?: string | undefined;
  titleOpacity: number;
  onBack?: (() => void) | undefined;
}

function buildHeaderStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
    paddingBottom: scale(16),
    backgroundColor: bgColor,
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
  };
}

export function BottomSheetHeader({ title, titleOpacity, onBack }: BottomSheetHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const headerStyle = useMemo(
    () => buildHeaderStyle(scale, theme.colors.secondaryBackground),
    [scale, theme.colors.secondaryBackground],
  );

  return (
    <View style={headerStyle}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8}>
          <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
        </Pressable>
      ) : (
        <View style={{ width: scale(24) }} />
      )}
      {title ? (
        <Text variant="subtitle" style={{ opacity: titleOpacity }}>
          {title}
        </Text>
      ) : (
        <View />
      )}
      <View style={{ width: scale(24), opacity: 0 }}>
        <Icon name="close" size={scale(24)} color={theme.colors.primaryText} />
      </View>
    </View>
  );
}
