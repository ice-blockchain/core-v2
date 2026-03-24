"use client";

import type { CSSProperties } from "react";
import { LoadingAnimation } from "@/components/loading-animation";
import { SecuredByFooter } from "@/components/secured-by-footer";

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  flex: 1,
  paddingTop: 50,
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
  margin: "0 0 40px",
};

function PasskeyIcon() {
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <circle cx={30} cy={28} r={12} stroke="#A0B4D0" strokeWidth={2} />
      <path
        d="M18 50C18 42 23 38 30 38C37 38 42 42 42 50"
        stroke="#A0B4D0"
        strokeWidth={2}
      />
      <circle cx={55} cy={35} r={6} stroke="#0166FF" strokeWidth={2} />
      <path
        d="M55 41V60M55 60L50 55M55 60L60 55"
        stroke="#0166FF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VerifyPasskeyScreen() {
  return (
    <div style={pageStyle}>
      <div style={{ width: 80, height: 80, marginBottom: 20 }}>
        <PasskeyIcon />
      </div>
      <h1 style={titleStyle}>Verify with a passkey</h1>
      <p style={subtitleStyle}>
        Your device will prompt you to confirm this action using your
        fingerprint, face, or screen lock
      </p>
      <div style={{ marginBottom: 40 }}>
        <LoadingAnimation variant="onLightBackground" size={30} />
      </div>
      <div style={{ marginTop: "auto", paddingBottom: 40 }}>
        <SecuredByFooter />
      </div>
    </div>
  );
}
