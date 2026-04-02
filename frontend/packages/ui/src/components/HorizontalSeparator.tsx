import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useMemo } from "react";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

export interface HorizontalSeparatorProps {
  style?: StyleProp<ViewStyle>;
}

const LINE_HEIGHT = 1;

const CONTAINER_STYLE: ViewStyle = {
  height: LINE_HEIGHT,
  alignSelf: "stretch",
};

export function HorizontalSeparator({ style }: HorizontalSeparatorProps) {
  const theme = useTheme();
  const fillColor = theme.colors.onTertiaryFill;

  const containerStyle = useMemo(
    () => [CONTAINER_STYLE, style],
    [style],
  );

  return (
    <View style={containerStyle}>
      <Svg width="100%" height={LINE_HEIGHT}>
        <Defs>
          <LinearGradient id="dividerGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={fillColor} stopOpacity="0" />
            <Stop offset="0.5" stopColor={fillColor} stopOpacity="1" />
            <Stop offset="1" stopColor={fillColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={LINE_HEIGHT} fill="url(#dividerGradient)" />
      </Svg>
    </View>
  );
}
