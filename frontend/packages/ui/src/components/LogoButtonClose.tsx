import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

interface LogoButtonCloseProps {
  size: number;
}

const VIEWBOX = "0 0 50 50";

export function LogoButtonClose({ size }: LogoButtonCloseProps) {
  const { primaryAccent, onPrimaryAccent } = useTheme().colors;

  return (
    <Svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <Path
        fill={primaryAccent}
        d="M4.411 35.65c-5.881-5.882-5.881-15.418 0-21.3l9.94-9.939c5.881-5.881 15.417-5.881 21.298 0l9.94 9.94c5.881 5.881 5.881 15.417 0 21.298l-9.94 9.94c-5.881 5.881-15.417 5.881-21.298 0z"
      />
      <Path
        stroke={onPrimaryAccent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="m25 25-6-6m6 6 6 6m-6-6 6-6m-6 6-6 6"
      />
    </Svg>
  );
}
