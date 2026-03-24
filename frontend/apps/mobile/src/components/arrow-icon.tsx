import Svg, { Path } from "react-native-svg";

interface ArrowIconProps {
  size?: number;
  color?: string;
}

export function ArrowIcon({ size = 24, color = "#FFFFFF" }: ArrowIconProps) {
  const viewBoxWidth = 15;
  const viewBoxHeight = 12;
  const scale = size / viewBoxWidth;

  return (
    <Svg
      width={viewBoxWidth * scale}
      height={viewBoxHeight * scale}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      fill="none"
    >
      <Path
        d="M8.5 1L13.5 6M13.5 6L8.5 11M13.5 6H1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
