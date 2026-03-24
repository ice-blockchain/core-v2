import type { CSSProperties } from "react";
import { RegisterPasswordIcon } from "@/components/register-password-icon";

const iconStyle: CSSProperties = {
  width: 65,
  height: 65,
  borderRadius: "50%",
  backgroundColor: "#0166FF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 20,
};

const titleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 28,
  color: "#0E0E0E",
  margin: "0 0 8px",
};

const subtitleStyle: CSSProperties = {
  fontWeight: 400,
  fontSize: 13,
  color: "#9A9A9A",
  textAlign: "center",
  maxWidth: 320,
  margin: 0,
};

export function RegisterHeader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20 }}>
      <div style={iconStyle}>
        <RegisterPasswordIcon />
      </div>
      <h1 style={titleStyle}>Register</h1>
      <p style={subtitleStyle}>
        Choose a strong password to create an account
      </p>
    </div>
  );
}
