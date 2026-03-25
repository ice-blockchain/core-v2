import Svg, { Path } from "react-native-svg";

interface BackArrowIconProps {
  size?: number;
  color?: string;
}

export function BackArrowIcon({ size = 24, color = "#0E0E0E" }: BackArrowIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6L9 12L15 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
