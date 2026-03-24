import type { CSSProperties } from "react";

const containerStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 11,
  fontWeight: 400,
  color: "#9A9A9A",
  lineHeight: "18px",
  maxWidth: 219,
};

const linkStyle: CSSProperties = {
  color: "#0166FF",
  textDecoration: "none",
};

export function TermsFooter() {
  return (
    <p style={containerStyle}>
      By continuing, you are agreeing to our{" "}
      <a href="/terms" style={linkStyle}>
        Terms of Service
      </a>{" "}
      &amp;{" "}
      <a href="/privacy" style={linkStyle}>
        Privacy Policy
      </a>
    </p>
  );
}
