"use client";

import type { CSSProperties, ReactNode } from "react";

interface MobileFrameProps {
  children: ReactNode;
}

const frameStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 430,
  height: "100vh",
  margin: "0 auto",
  overflow: "hidden",
};

export function MobileFrame({ children }: MobileFrameProps) {
  return <div style={frameStyle}>{children}</div>;
}
