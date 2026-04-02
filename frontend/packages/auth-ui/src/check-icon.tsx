import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

interface CheckIconProps {
  size?: number;
}

export function CheckIcon({ size = 16 }: CheckIconProps) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={7} fill={colors.success} />
      <Path
        d="M5 8L7 10L11 6"
        stroke={colors.onPrimaryAccent}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
