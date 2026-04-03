// AUTO-GENERATED — do not edit manually. Run `pnpm generate:icons`.

import Svg, { Path, Rect } from "react-native-svg";

interface ChatArchiveIconProps {
  size?: number;
  color: string;
}

export function ChatArchiveIcon({ size = 24, color }: ChatArchiveIconProps) {
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={3.5} rx={1} stroke={color} strokeWidth={1.4} />
      <Path d="M5 7.5V19C5 19.55 5.45 20 6 20H18C18.55 20 19 19.55 19 19V7.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M12 11V16M10 13.5L12 16L14 13.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
