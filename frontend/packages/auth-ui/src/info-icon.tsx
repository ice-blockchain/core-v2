import Svg, { Path } from "react-native-svg";

export function InfoIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.2V12m0-3.2h.008M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
        stroke="#0166FF"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
