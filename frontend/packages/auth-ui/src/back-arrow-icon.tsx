import Svg, { Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

interface BackArrowIconProps {
  size?: number;
  color?: string;
}

export function BackArrowIcon({ size = 24, color }: BackArrowIconProps) {
  const { colors } = useTheme();
  const strokeColor = color ?? colors.primaryText;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6L9 12L15 18"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
