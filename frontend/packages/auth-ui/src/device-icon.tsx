import Svg, { Path } from "react-native-svg";

interface DeviceIconProps {
  size?: number;
  color?: string;
}

export function DeviceIcon({ size = 24, color = "#0166FF" }: DeviceIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.6 10.4c0-3.017 0-4.525.937-5.463S8.983 4 12 4s4.525 0 5.462.937c.938.938.938 2.446.938 5.463v3.2c0 3.017 0 4.525-.938 5.463S15.017 20 12 20s-4.526 0-5.463-.937S5.6 16.617 5.6 13.6z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M14.4 17.6H9.6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
