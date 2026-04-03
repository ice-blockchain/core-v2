import Svg, { Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

interface ArrowIconProps {
  size?: number;
  color?: string;
}

export function ArrowIcon({ size = 24, color }: ArrowIconProps) {
  const theme = useTheme();
  const strokeColor = color ?? theme.colors.onPrimaryAccent;
  const viewBoxWidth = 15;
  const viewBoxHeight = 12;
  const scale = size / viewBoxWidth;

  return (
    <Svg
      width={viewBoxWidth * scale}
      height={viewBoxHeight * scale}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      fill="none"
    >
      <Path
        d="M8.5 1L13.5 6M13.5 6L8.5 11M13.5 6H1"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
