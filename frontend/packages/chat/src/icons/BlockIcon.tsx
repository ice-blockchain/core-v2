import Svg, { Circle, Path } from "react-native-svg";

interface BlockIconProps {
  size?: number;
  color: string;
}

export function BlockIcon({ size = 24, color }: BlockIconProps) {
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.4} />
      <Path d="M5.64 18.36L18.36 5.64" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}
