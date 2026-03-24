import Svg, { Path } from "react-native-svg";

interface ManageIconProps {
  size?: number;
  color?: string;
}

export function ManageIcon({ size = 24, color = "#0166FF" }: ManageIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7H11M14 17H5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 20C18.657 20 20 18.657 20 17C20 15.343 18.657 14 17 14C15.343 14 14 15.343 14 17C14 18.657 15.343 20 17 20Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 10C8.657 10 10 8.657 10 7C10 5.343 8.657 4 7 4C5.343 4 4 5.343 4 7C4 8.657 5.343 10 7 10Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
