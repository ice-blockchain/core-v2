"use client";

import type { CSSProperties, ReactNode } from "react";

interface IntroVideoProps {
  children: ReactNode;
}

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: "#000000",
};

const videoStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const overlayStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  width: "100%",
  height: "100%",
  paddingBottom: 76,
};

export function IntroVideo({ children }: IntroVideoProps) {
  return (
    <div style={containerStyle}>
      <video
        src="/videos/intro.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={videoStyle}
      />
      <div style={overlayStyle}>{children}</div>
    </div>
  );
}
