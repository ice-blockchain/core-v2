import Svg, { Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

export function InfoIcon() {
  const theme = useTheme();
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.2V12m0-3.2h.008M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
        stroke={theme.colors.primaryAccent}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
