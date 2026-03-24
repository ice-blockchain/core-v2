"use client";

import type { CSSProperties, ReactNode } from "react";

interface SecondaryButtonProps {
  label: string;
  onClick?: () => void;
  leftIcon?: ReactNode;
}

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: 287,
  height: 56,
  backgroundColor: "#FFFFFF",
  border: "1px solid #CCCCCC",
  borderRadius: 16,
  cursor: "pointer",
  padding: "0 24px",
};

const labelStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  lineHeight: "18px",
  color: "#494949",
  whiteSpace: "nowrap",
};

export function SecondaryButton({
  label,
  onClick,
  leftIcon,
}: SecondaryButtonProps) {
  return (
    <button type="button" onClick={onClick} style={buttonStyle}>
      {leftIcon}
      <span style={labelStyle}>{label}</span>
    </button>
  );
}
