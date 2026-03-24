"use client";

import type { CSSProperties } from "react";

interface PrimaryButtonProps {
  label: string;
  onClick?: () => void;
  style?: CSSProperties;
}

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: 287,
  height: 56,
  backgroundColor: "#0166FF",
  borderRadius: 16,
  border: "none",
  cursor: "pointer",
  padding: "0 24px",
};

const labelStyle: CSSProperties = {
  fontFamily: "'Noto Sans', sans-serif",
  fontWeight: 600,
  fontSize: 13,
  lineHeight: "18px",
  color: "#FFFFFF",
  whiteSpace: "nowrap",
};

const arrowStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export function PrimaryButton({ label, onClick, style }: PrimaryButtonProps) {
  return (
    <button type="button" onClick={onClick} style={{ ...buttonStyle, ...style }}>
      <span style={labelStyle}>{label}</span>
      <span style={arrowStyle}>
        <svg width={15} height={12} viewBox="0 0 15 12" fill="none">
          <path
            d="M8.5 1L13.5 6M13.5 6L8.5 11M13.5 6H1"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
