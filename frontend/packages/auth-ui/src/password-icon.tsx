import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTheme } from "@ion/ui";

export function PasswordIcon() {
  const theme = useTheme();
  const color = theme.colors.secondaryText;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={6}
        y={6}
        width={12}
        height={12}
        rx={3}
        stroke={color}
        strokeWidth={1.2}
      />
      <Circle cx={12} cy={11} r={1} fill={color} />
      <Path
        d="M12 12V14"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
