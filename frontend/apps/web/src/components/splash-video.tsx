"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { timingConfig } from "@ion/config";

interface SplashVideoProps {
  onComplete: () => void;
}

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100vh",
  backgroundColor: "#FFFFFF",
};

export function SplashVideo({ onComplete }: SplashVideoProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, timingConfig.splashDurationMs);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return <div style={containerStyle} />;
}
