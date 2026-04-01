import { useMemo } from "react";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";

const WIDTH = 0.5;
const HEIGHT = 25;
const START = { x: 0.5, y: 1 };
const END = { x: 0.5, y: 0 };
const LOCATIONS = [0, 0.5, 1];

export function VerticalSeparator() {
  const { colors, scale } = useTheme();
  const fillColor = colors.onTertiaryFill;

  const gradientColors = useMemo(
    () => [`${fillColor}00`, fillColor, `${fillColor}00`],
    [fillColor],
  );

  const gradientStyle = useMemo(
    () => ({ width: scale.scaleSize(WIDTH), height: scale.scaleSize(HEIGHT) }),
    [scale],
  );

  return (
    <LinearGradient colors={gradientColors} start={START} end={END} locations={LOCATIONS} style={gradientStyle} />
  );
}
