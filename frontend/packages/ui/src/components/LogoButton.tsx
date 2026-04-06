import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

interface LogoButtonProps {
  size: number;
}

const VIEWBOX = "0 0 50 50";

export function LogoButton({ size }: LogoButtonProps) {
  const { primaryAccent, onPrimaryAccent } = useTheme().colors;

  return (
    <Svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <Defs>
        <ClipPath id="lb">
          <Path d="M0 0h50v50H0z" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#lb)">
        <Path
          fill={primaryAccent}
          d="M4.411 35.65c-5.881-5.882-5.881-15.418 0-21.3l9.94-9.939c5.881-5.881 15.417-5.881 21.298 0l9.94 9.94c5.881 5.881 5.881 15.417 0 21.298l-9.94 9.94c-5.881 5.881-15.417 5.881-21.298 0z"
        />
        <Path
          fill={onPrimaryAccent}
          d="M24.8 9.015 24.795 9v.03l-2.268 9.87 2.268 4.886v.014l.003-.007.004.007v-.014L27.07 18.9 24.803 9.03V9zM24.706 40.985l.003.015v-.03l2.268-9.87-2.268-4.886V26.2l-.003.007-.004-.007v.014L22.434 31.1l2.268 9.871V41zM38.483 16.675l.013-.014-.031.02-9.608 3.27-2.97 4.49-.015.01.009-.002-.006.01.016-.01 5.357-.649 7.222-7.113.03-.018zM11.016 33.326l-.012.012.03-.018 9.609-3.271 2.971-4.491.014-.009-.009.001.006-.008-.015.01-5.358.648-7.223 7.114-.029.017zM11.048 16.622l-.014-.005.024.015 7.2 7.147 5.358.669.012.007-.004-.006h.008l-.013-.007-2.955-4.505-9.603-3.31-.023-.015zM38.453 33.38l.014.005-.024-.016-7.2-7.146-5.358-.67-.012-.006.005.006-.009-.001.013.008 2.956 4.505 9.601 3.31.025.015z"
        />
      </G>
    </Svg>
  );
}
