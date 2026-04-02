import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

interface CrossIconProps {
  size?: number;
}

export function CrossIcon({ size = 16 }: CrossIconProps) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={7} stroke={colors.strokeElements} strokeWidth={1} />
      <Path
        d="M6 6L10 10M10 6L6 10"
        stroke={colors.strokeElements}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
