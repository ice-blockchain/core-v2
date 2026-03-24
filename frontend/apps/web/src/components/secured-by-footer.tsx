import type { CSSProperties } from "react";

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const textStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 12,
  color: "#494949",
};

const brandStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 12,
  color: "#0166FF",
};

const iconStyle: CSSProperties = {
  width: 20,
  height: 20,
};

export function SecuredByFooter() {
  return (
    <div style={containerStyle}>
      <span style={textStyle}>Secured by</span>
      <svg style={iconStyle} viewBox="0 0 20 20" fill="none">
        <path
          d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z"
          fill="#0166FF"
          opacity={0.2}
        />
        <path
          d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z"
          stroke="#0166FF"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </svg>
      <span style={brandStyle}>Identity.io</span>
    </div>
  );
}
