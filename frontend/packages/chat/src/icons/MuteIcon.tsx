import Svg, { Path } from "react-native-svg";

interface MuteIconProps {
  size?: number;
  color: string;
}

export function MuteIcon({ size = 24, color }: MuteIconProps) {
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <Path d="M18 11C18 7.69 15.31 5 12 5C10.22 5 8.63 5.81 7.56 7.09" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M6 9.34V11V15L4 17H17.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 15V11" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M20 17H18" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M10 20.5C10.5 21.4 11.2 22 12 22C12.8 22 13.5 21.4 14 20.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M3 3L21 21" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}
