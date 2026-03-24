"use client";

import type { CSSProperties } from "react";
import { BackArrowIcon } from "./back-arrow-icon";

interface SheetHeaderProps {
  title: string;
  onBack: () => void;
}

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "20px 16px 16px",
};

const titleStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
  color: "#0E0E0E",
  textAlign: "center",
};

const backButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const placeholderStyle: CSSProperties = {
  width: 24,
  height: 24,
  opacity: 0,
};

export function SheetHeader({ title, onBack }: SheetHeaderProps) {
  return (
    <div style={containerStyle}>
      <button type="button" onClick={onBack} style={backButtonStyle}>
        <BackArrowIcon />
      </button>
      <span style={titleStyle}>{title}</span>
      <div style={placeholderStyle} />
    </div>
  );
}
