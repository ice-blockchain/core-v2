interface CrossIconProps {
  size?: number;
}

export function CrossIcon({ size = 16 }: CrossIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx={8} cy={8} r={7} stroke="#CCCCCC" strokeWidth={1} />
      <path
        d="M6 6L10 10M10 6L6 10"
        stroke="#CCCCCC"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}
