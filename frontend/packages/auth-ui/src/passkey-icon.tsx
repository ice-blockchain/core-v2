import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

export function PasskeyIcon() {
  const theme = useTheme();
  const mutedColor = theme.colors.tertiaryText;
  const accentColor = theme.colors.primaryAccent;
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={30} cy={28} r={12} stroke={mutedColor} strokeWidth={2} />
      <Path
        d="M18 50C18 42 23 38 30 38C37 38 42 42 42 50"
        stroke={mutedColor}
        strokeWidth={2}
      />
      <Circle cx={55} cy={35} r={6} stroke={accentColor} strokeWidth={2} />
      <Path
        d="M55 41V60M55 60L50 55M55 60L60 55"
        stroke={accentColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
