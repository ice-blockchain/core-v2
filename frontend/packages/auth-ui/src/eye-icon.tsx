import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@ion/ui";

interface EyeIconProps {
  isOff?: boolean;
}

export function EyeIcon({ isOff = false }: EyeIconProps) {
  const { colors } = useTheme();

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5C7 5 3 9.5 2 12C3 14.5 7 19 12 19C17 19 21 14.5 22 12C21 9.5 17 5 12 5Z"
        stroke={colors.secondaryText}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={colors.secondaryText} strokeWidth={1.5} />
      {isOff && (
        <Path
          d="M4 20L20 4"
          stroke={colors.secondaryText}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
