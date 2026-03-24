interface EyeIconProps {
  isOff?: boolean;
}

export function EyeIcon({ isOff = false }: EyeIconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5C7 5 3 9.5 2 12C3 14.5 7 19 12 19C17 19 21 14.5 22 12C21 9.5 17 5 12 5Z"
        stroke="#494949"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={12} r={3} stroke="#494949" strokeWidth={1.5} />
      {isOff && (
        <path
          d="M4 20L20 4"
          stroke="#494949"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
