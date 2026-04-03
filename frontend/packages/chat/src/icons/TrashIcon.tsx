// AUTO-GENERATED — do not edit manually. Run `pnpm generate:icons`.

import Svg, { Path } from "react-native-svg";

interface TrashIconProps {
  size?: number;
  color: string;
}

export function TrashIcon({ size = 24, color }: TrashIconProps) {
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <Path d="M3 6H21" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M8 6V4.5C8 3.67 8.67 3 9.5 3H14.5C15.33 3 16 3.67 16 4.5V6" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M19 6L18 20H6L5 6" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 10.5V16.5M14 10.5V16.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}
