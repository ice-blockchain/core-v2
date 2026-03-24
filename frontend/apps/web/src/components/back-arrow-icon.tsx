import type { CSSProperties } from "react";

interface BackArrowIconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function BackArrowIcon({
  size = 24,
  color = "#0E0E0E",
  style,
}: BackArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
    >
      <path
        d="M15 6L9 12L15 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
