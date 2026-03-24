interface CheckIconProps {
  size?: number;
}

export function CheckIcon({ size = 16 }: CheckIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx={8} cy={8} r={7} fill="#34C759" />
      <path
        d="M5 8L7 10L11 6"
        stroke="white"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
